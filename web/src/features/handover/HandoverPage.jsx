// QR handover verification.
//
// The donor shows a code, the recipient scans it, and the exchange is recorded.
// Two panes because the same person is never on both sides.
//
// Scanning decodes a *photograph* of the code rather than a live video stream.
// Browsers only allow getUserMedia on HTTPS or localhost, and this app is opened
// over plain HTTP on a LAN address during testing and demos, where a live preview
// would simply fail. A photo plus jsQR works everywhere, and manual entry is kept
// as the fallback for a damaged or unreadable code.

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import jsQR from "jsqr";
import { Camera, CheckCircle2, Loader2, QrCode, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { errorMessage, listingsAPI, qrAPI } from "@/lib/api";
import RateUserDialog from "@/features/ratings/RateUserDialog";

/** Decode a QR from an image file. Returns the payload string, or null. */
async function decodeQrFromFile(file) {
  const bitmap = await createImageBitmap(file);

  // Very large photos are slow to scan and no more accurate; cap the long edge.
  const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, width, height);

  const { data } = context.getImageData(0, 0, width, height);
  const result = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  return result?.data || null;
}

function DonorPane() {
  const [selected, setSelected] = useState(null);
  const [qr, setQr] = useState(null);
  const [generating, setGenerating] = useState(false);

  const listings = useQuery({
    queryKey: ["my-listings-handover"],
    queryFn: async () => (await listingsAPI.getUserListings()).data,
  });

  // Only an assigned listing has a recipient to hand over to.
  const assigned = (listings.data?.listings || []).filter((listing) =>
    ["assigned", "pending"].includes(listing.status),
  );

  async function generate(listing) {
    setSelected(listing._id);
    setGenerating(true);
    setQr(null);
    try {
      const recipientId = listing.assignedTo?._id || listing.assignedTo;
      const { data } = await qrAPI.generate(listing._id, recipientId);
      setQr(data);
    } catch (error) {
      toast.error(errorMessage(error, "Could not generate a code"));
    } finally {
      setGenerating(false);
    }
  }

  if (listings.isLoading) return <LoadingState label="Loading your items" />;

  if (assigned.length === 0) {
    return (
      <EmptyState
        title="Nothing awaiting handover"
        description="Once you assign an item to someone, generate a code here for them to scan."
      />
    );
  }

  return (
    <div className="space-y-3">
      {assigned.map((listing) => (
        <Card key={listing._id}>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[14.5px] font-medium">{listing.title}</div>
                <div className="text-[12.5px] text-muted-foreground">{listing.status}</div>
              </div>
              <Button size="sm" onClick={() => generate(listing)} disabled={generating}>
                {generating && selected === listing._id ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-3.5 w-3.5" />
                )}
                Show code
              </Button>
            </div>

            {selected === listing._id && qr && (
              <div className="flex flex-col items-center gap-3 border-t border-border pt-4">
                {qr.qrCodeImage ? (
                  <img
                    src={qr.qrCodeImage}
                    alt="Handover code"
                    className="h-52 w-52 rounded-md border border-border bg-white p-2"
                  />
                ) : (
                  <div className="text-[13px] text-muted-foreground">Code generated.</div>
                )}
                <p className="text-center text-[12.5px] text-muted-foreground">
                  Show this to the recipient. They scan it to confirm the handover.
                </p>
                {qr.qrCode && (
                  <code className="max-w-full truncate rounded bg-muted px-2 py-1 font-mono text-[11px]">
                    {qr.qrCode}
                  </code>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecipientPane() {
  const fileInput = useRef(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [rating, setRating] = useState(false);

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const decoded = await decodeQrFromFile(file);
      if (!decoded) {
        toast.error("No code found in that photo. Try again, closer and steadier.");
        return;
      }
      setCode(decoded);
      await verify(decoded);
    } catch {
      toast.error("Could not read that image");
    }
  }

  async function verify(value) {
    const payload = (value ?? code).trim();
    if (!payload) return;

    setVerifying(true);
    try {
      // Location is optional server-side, and asking for it must not block the
      // handover if permission is denied.
      let location = null;
      if (navigator.geolocation) {
        location = await new Promise((resolve) =>
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 5000 },
          ),
        );
      }

      const { data } = await qrAPI.verify(payload, location);
      setResult(data);
      toast.success("Handover confirmed");
    } catch (error) {
      toast.error(errorMessage(error, "Could not verify that code"));
    } finally {
      setVerifying(false);
    }
  }

  if (result) {
    // The transaction shape varies by endpoint version, so look in the likely
    // places rather than assuming one.
    const counterparty =
      result.transaction?.donor || result.donor || result.transaction?.listing?.donor;

    return (
      <>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-green-300 bg-green-50 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="text-[16px] font-medium">Handover complete</div>
            <p className="max-w-sm text-[13.5px] text-muted-foreground">
              The exchange is recorded and both of you have been credited.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {counterparty && (
                <Button onClick={() => setRating(true)}>Rate the donor</Button>
              )}
              <Button variant="outline" onClick={() => { setResult(null); setCode(""); }}>
                Scan another
              </Button>
            </div>
          </CardContent>
        </Card>

        {counterparty && (
          <RateUserDialog
            open={rating}
            onOpenChange={setRating}
            user={counterparty}
            listingId={result.transaction?.listing?._id || result.transaction?.listing}
          />
        )}
      </>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhoto}
        />

        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-8">
          <ScanLine className="h-7 w-7 text-muted-foreground" />
          <div className="text-center">
            <div className="text-[14px] font-medium">Scan the donor&apos;s code</div>
            <div className="mt-0.5 text-[12.5px] text-muted-foreground">
              Take a photo of the code they show you
            </div>
          </div>
          <Button onClick={() => fileInput.current?.click()} disabled={verifying}>
            {verifying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            Scan code
          </Button>
        </div>

        <div className="space-y-1.5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Or enter it by hand
          </div>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Handover code"
              autoComplete="off"
            />
            <Button variant="outline" onClick={() => verify()} disabled={!code.trim() || verifying}>
              Verify
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HandoverPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Handover</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          A scanned code is what records the exchange, so neither side has to be taken on
          trust.
        </p>
      </header>

      <Tabs defaultValue="give">
        <TabsList className="w-full">
          <TabsTrigger value="give" className="flex-1">
            I am giving
          </TabsTrigger>
          <TabsTrigger value="receive" className="flex-1">
            I am collecting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="give" className="pt-4">
          <DonorPane />
        </TabsContent>
        <TabsContent value="receive" className="pt-4">
          <RecipientPane />
        </TabsContent>
      </Tabs>

      <div className="flex items-start gap-2 rounded-md border border-border bg-secondary px-3 py-2.5 text-[12.5px] text-muted-foreground">
        <Badge variant="outline" className="shrink-0">Why</Badge>
        <span>
          Codes are signed and expire, so a screenshot taken earlier will not verify. The
          scan is what marks the item collected and credits both parties.
        </span>
      </div>
    </div>
  );
}
