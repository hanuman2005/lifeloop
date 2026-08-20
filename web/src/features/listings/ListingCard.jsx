import { Link } from "react-router-dom";
import { MapPin, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_TONE, categoryLabel } from "@/features/listings/constants";
import { cn } from "@/lib/utils";

export default function ListingCard({ listing }) {
  const image = listing.images?.[0];

  return (
    <Link to={`/listings/${listing._id}`} className="block group">
      <Card className="h-full overflow-hidden border-border transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-card-hover">
        <div className="aspect-[4/3] bg-muted overflow-hidden">
          {image ? (
            <img src={image} alt={listing.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Package className="h-8 w-8" />
            </div>
          )}
        </div>
        <CardContent className="space-y-2 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="line-clamp-1 text-[14.5px] font-semibold">{listing.title}</div>
            {listing.status && (
              <Badge variant="outline" className={cn("shrink-0 text-[11px]", STATUS_TONE[listing.status])}>
                {listing.status}
              </Badge>
            )}
          </div>
          <p className="line-clamp-2 text-[13px] text-muted-foreground leading-relaxed">{listing.description}</p>
          <div className="flex items-center gap-3 pt-1 text-[12.5px] text-muted-foreground">
            <span className="font-medium">{categoryLabel(listing.category)}</span>
            <span className="tabular-nums">{listing.quantity} {listing.unit || "items"}</span>
          </div>
          {listing.pickupLocation && (
            <div className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 text-accent" />
              <span className="line-clamp-1">{listing.pickupLocation}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
