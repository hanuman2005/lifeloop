import { Link } from "react-router-dom";
import { MapPin, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_TONE, categoryLabel } from "@/features/listings/constants";
import { cn } from "@/lib/utils";

export default function ListingCard({ listing }) {
  const image = listing.images?.[0];

  return (
    <Link to={`/listings/${listing._id}`} className="block">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-card-hover">
        <div className="aspect-[4/3] bg-muted">
          {image ? (
            <img src={image} alt={listing.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Package className="h-7 w-7" />
            </div>
          )}
        </div>
        <CardContent className="space-y-1.5 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="line-clamp-1 text-[14.5px] font-medium">{listing.title}</div>
            {listing.status && (
              <Badge variant="outline" className={cn("shrink-0", STATUS_TONE[listing.status])}>
                {listing.status}
              </Badge>
            )}
          </div>
          <div className="line-clamp-2 text-[13px] text-muted-foreground">{listing.description}</div>
          <div className="flex items-center gap-3 pt-0.5 text-[12.5px] text-muted-foreground">
            <span>{categoryLabel(listing.category)}</span>
            <span className="tabular-nums">{listing.quantity} {listing.unit || "items"}</span>
          </div>
          {listing.pickupLocation && (
            <div className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{listing.pickupLocation}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
