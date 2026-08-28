import { Link } from "react-router-dom";
import { Box, Book, Shirt, Smartphone, Armchair, Recycle, Gamepad2, Dumbbell, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_TONE, categoryLabel } from "@/features/listings/constants";
import { cn } from "@/lib/utils";

// Most listings arrive without a photograph, and the placeholder was a flat grey
// rectangle taking up three fifths of every card. A grid of those reads as a page
// that failed to load.
//
// Instead the card falls back to the category: its own icon on its own tint. That
// carries real information — you can scan a grid and see the electronics — and a
// row of differently coloured cards looks deliberate where a row of identical grey
// boxes looks broken.
const CATEGORY_STYLE = {
  "household-items": { icon: Box, tint: "bg-blue-50 text-blue-600" },
  clothing: { icon: Shirt, tint: "bg-pink-50 text-pink-600" },
  electronics: { icon: Smartphone, tint: "bg-violet-50 text-violet-600" },
  furniture: { icon: Armchair, tint: "bg-amber-50 text-amber-700" },
  books: { icon: Book, tint: "bg-orange-50 text-orange-700" },
  toys: { icon: Gamepad2, tint: "bg-teal-50 text-teal-600" },
  sports: { icon: Dumbbell, tint: "bg-lime-50 text-lime-700" },
  "scrap-materials": { icon: Recycle, tint: "bg-slate-100 text-slate-600" },
  other: { icon: Box, tint: "bg-secondary text-muted-foreground" },
};

export default function ListingCard({ listing }) {
  const image = listing.images?.[0];
  const style = CATEGORY_STYLE[listing.category] || CATEGORY_STYLE.other;
  const Icon = style.icon;

  return (
    <Link to={`/listings/${listing._id}`} className="group block">
      <Card className="h-full overflow-hidden border-border transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-card-hover">
        {/* 16/9 rather than 4/3: without a photograph there is nothing to fill the
            taller box with, and the shorter one puts the title higher up the card. */}
        <div className="aspect-[16/9] overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={listing.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className={cn("flex h-full items-center justify-center", style.tint)}>
              <Icon className="h-7 w-7" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <CardContent className="space-y-2 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="line-clamp-1 text-[14.5px] font-semibold">{listing.title}</div>
            {listing.status && (
              <Badge
                variant="outline"
                className={cn("shrink-0 text-[11px]", STATUS_TONE[listing.status])}
              >
                {listing.status}
              </Badge>
            )}
          </div>

          <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {listing.description}
          </p>

          <div className="flex items-center gap-3 pt-1 text-[12.5px] text-muted-foreground">
            <span className="font-medium">{categoryLabel(listing.category)}</span>
            <span className="tabular-nums">
              {listing.quantity} {listing.unit || "items"}
            </span>
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
