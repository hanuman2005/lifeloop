// M2 — the two-tap bin report.
//
// Used standing next to a bin, one-handed, often in poor light. Every decision
// here follows from that: large targets, geolocation requested up front so the
// fix has time to settle, and the photo optional so a report is never blocked by
// a slow camera.

import { useEffect, useState } from "react";
import { AlertTriangle, Camera, Check, Crosshair, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { binsAPI, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "ok", label: "Fine", hint: "Space left, no action needed", tone: "border-green-300 bg-green-50 text-green-800" },
  { value: "full", label: "Full", hint: "Needs collecting soon", tone: "border-amber-300 bg-amber-50 text-amber-800" },
  { value: "overflowing", label: "Overflowing", hint: "Spilling out, urgent", tone: "border-red-300 bg-red-50 text-red-800" },
];

/** Reads the photo as base64 without the data: prefix the API does not want. */
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the photo"));
    reader.readAsDataURL(file);
  });
}

export default function BinReportPage() {
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [status, setStatus] = useState(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  // Requested on mount rather than at submit: a GPS fix can take several seconds
  // and asking for it only once the user has chosen a status wastes that time
  // while they stand there waiting.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("This browser cannot provide your location.");
      setLocating(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationError(null);
        setLocating(false);
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied. A bin report needs a location to be useful."
            : "Could not determine your location.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit() {
    if (!status || !position) return;
    setSubmitting(true);

    try {
      const payload = {
        status,
        lat: position.lat,
        lng: position.lng,
        accuracyMetres: Math.round(position.accuracy ?? 0),
        note: note.trim() || undefined,
      };
      if (photo) payload.imageBase64 = await readAsBase64(photo);

      const { data } = await binsAPI.report(payload);

      // 202 with accepted:false is a screening rejection, not a transport error.
      if (!data.accepted) {
        toast.warning(data.message || "Report was not accepted");
        setSubmitting(false);
        return;
      }

      setDone({ pointsEarned: data.pointsEarned, status });
    } catch (error) {
      toast.error(errorMessage(error, "Could not send the report"));
    } finally {
      setSubmitting(false);
    }
  }

  function reportAnother() {
    if (preview) URL.revokeObjectURL(preview);
    setStatus(null);
    setNote("");
    setPhoto(null);
    setPreview(null);
    setDone(null);
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-green-300 bg-green-50 text-green-700">
            <Check className="h-5 w-5" />
          </div>
          <div className="text-[16px] font-medium">Report sent</div>
          <p className="max-w-sm text-[13.5px] text-muted-foreground">
            Thank you. This bin now shows on the ward map, and feeds the collection route
            if it needs emptying.
          </p>
          {done.pointsEarned > 0 && (
            <div className="font-mono text-[12px] uppercase tracking-wider text-accent">
              +{done.pointsEarned} eco points
            </div>
          )}
          <Button className="mt-2" onClick={reportAnother}>
            Report another bin
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Report a bin</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Two taps. Your reports build a live map of which bins actually need collecting.
        </p>
      </header>

      {/* Location status is shown first because nothing else can be submitted without it. */}
      <Card>
        <CardContent className="flex items-start gap-3 py-4">
          <Crosshair className={cn("mt-0.5 h-4 w-4 shrink-0", position ? "text-accent" : "text-muted-foreground")} />
          <div className="min-w-0 flex-1 text-[13px]">
            {locating && <span className="text-muted-foreground">Finding your location…</span>}
            {locationError && <span className="text-destructive">{locationError}</span>}
            {position && (
              <>
                <div className="font-medium tabular-nums">
                  {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                </div>
                <div className="text-muted-foreground">
                  Accurate to about {Math.round(position.accuracy)} m
                  {position.accuracy > 200 && " — move to open sky for a better fix"}
                </div>
              </>
            )}
          </div>
          {locating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
          What is the bin like?
        </div>
        <div className="grid gap-2">
          {STATUSES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={cn(
                "flex items-center gap-3 rounded-md border p-4 text-left transition-colors",
                status === option.value ? option.tone : "border-border bg-card hover:bg-secondary",
              )}
            >
              <Trash2 className="h-5 w-5 shrink-0" />
              <span className="flex-1">
                <span className="block text-[15px] font-medium">{option.label}</span>
                <span className="block text-[12.5px] opacity-80">{option.hint}</span>
              </span>
              {status === option.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
          Photo <span className="normal-case tracking-normal">(optional)</span>
        </div>
        {preview ? (
          <Card className="overflow-hidden">
            <img src={preview} alt="Bin" className="max-h-56 w-full object-cover" />
            <CardContent className="py-3">
              <Button variant="outline" size="sm" onClick={() => { setPhoto(null); setPreview(null); }}>
                Remove photo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border py-6 text-[13.5px] text-muted-foreground hover:bg-secondary">
            <Camera className="h-4 w-4" />
            Add a photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>
        )}
      </div>

      <div className="space-y-2">
        <div className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
          Note <span className="normal-case tracking-normal">(optional)</span>
        </div>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 200))}
          placeholder="Anything a collector should know — blocked access, spillage, smell"
          rows={3}
        />
      </div>

      {position && position.accuracy > 200 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Your location fix is poor, so this report will carry less weight on the map.
          </span>
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={!status || !position || submitting}
        onClick={submit}
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {position ? "Send report" : "Waiting for location…"}
      </Button>
    </div>
  );
}
