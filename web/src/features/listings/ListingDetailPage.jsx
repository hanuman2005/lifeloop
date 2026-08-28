import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPin, Package, User } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { errorMessage, listingsAPI } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import InterestedUsers from "@/features/listings/InterestedUsers";
import { STATUS_TONE, categoryLabel } from "@/features/listings/constants";
import { cn } from "@/lib/utils";

export default function ListingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data: body } = await listingsAPI.getById(id);
      // getListingById responds with the listing document directly, unlike the
      // list endpoint which wraps it in { success, listings }. Handle both so a
      // later change to either shape does not break this screen.
      return body?.listing || body;
    },
  });

  const interest = useMutation({
    mutationFn: () => listingsAPI.expressInterest(id, {}),
    onSuccess: () => {
      toast.success("Interest registered. The donor can now see you.");
      queryClient.invalidateQueries({ queryKey: ["listing", id] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not register interest")),
  });

  if (isLoading) return <LoadingState label="Loading item" />;
  if (isError || !data) {
    return (
      <EmptyState
        title="Item not found"
        description="It may have been collected or withdrawn."
        action={<Button variant="accent" asChild><Link to="/listings">Back to the exchange</Link></Button>}
      />
    );
  }

  const listing = data;
  const donorId = listing.donor?._id || listing.donor;
  const isOwner = donorId && String(donorId) === String(user?._id);
  const images = listing.images?.length ? listing.images : [];

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/listings"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
      </Button>

      <Card className="overflow-hidden">
        <div className="aspect-[16/10] bg-muted">
          {images.length ? (
            <img src={images[activeImage]} alt={listing.title} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Package className="h-12 w-12" />
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 border-b border-border p-3 overflow-x-auto">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setActiveImage(index)}
                className={cn(
                  "h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                  index === activeImage ? "border-accent shadow-sm" : "border-border opacity-70 hover:opacity-100",
                )}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <CardContent className="space-y-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-[20px] font-bold tracking-tight">{listing.title}</h1>
            {listing.status && (
              <Badge variant="outline" className={cn("shrink-0", STATUS_TONE[listing.status])}>
                {listing.status}
              </Badge>
            )}
          </div>

          <p className="text-[14px] leading-relaxed text-muted-foreground">{listing.description}</p>

          <Separator />

          <dl className="grid grid-cols-2 gap-4 text-[13.5px]">
            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Category</dt>
              <dd className="mt-1 font-medium">{categoryLabel(listing.category)}</dd>
            </div>
            <div className="rounded-md border border-border bg-secondary/30 p-3">
              <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Quantity</dt>
              <dd className="mt-1 font-medium tabular-nums">{listing.quantity} {listing.unit || "items"}</dd>
            </div>
            {listing.pickupLocation && (
              <div className="col-span-2 rounded-md border border-border bg-secondary/30 p-3">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Pickup</dt>
                <dd className="mt-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                  {listing.pickupLocation}
                </dd>
              </div>
            )}
            {listing.donor?.firstName && (
              <div className="col-span-2 rounded-md border border-border bg-secondary/30 p-3">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Offered by</dt>
                <dd className="mt-1 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-accent" />
                  {listing.donor.firstName} {listing.donor.lastName || ""}
                </dd>
              </div>
            )}
          </dl>

          {!isOwner && listing.status === "available" && (
            <Button className="w-full" size="lg" onClick={() => interest.mutate()} disabled={interest.isPending}>
              {interest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              I want this
            </Button>
          )}

          {!isOwner && listing.status !== "available" && (
            <div className="rounded-md border border-border bg-secondary px-3 py-3 text-[13px] text-muted-foreground">
              This item is no longer available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Only the donor sees who has asked, and only they can choose. */}
      {isOwner && <InterestedUsers listing={listing} />}

      {isOwner && listing.status === "assigned" && (
        <div className="rounded-md border border-accent/20 bg-accent-tint px-3 py-3 text-[13px] text-muted-foreground">
          Assigned. Agree a time under Pickups, then show your code on the Handover screen
          when you meet.
        </div>
      )}
    </div>
  );
}
