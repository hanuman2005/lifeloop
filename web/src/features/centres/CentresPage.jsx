// Where to actually take something once you know what it is.
//
// The scanner answers "what is this" but the loop only closes when the user knows
// where it goes. Filtering by material is the point: a list of every centre is far
// less useful than the three that will take the item in your hand.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, IndianRupee, MapPin, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { mapAPI } from "@/lib/api";
import { MATERIAL_GUIDE } from "@/features/scanner/materials";
import { cn } from "@/lib/utils";

const MATERIALS = Object.keys(MATERIAL_GUIDE);

export default function CentresPage() {
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(true);
  const [material, setMaterial] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["centres", position?.lat, position?.lng, material],
    queryFn: async () =>
      (
        await mapAPI.getNearbyCenters({
          lat: position.lat,
          lng: position.lng,
          radius: 25,
          ...(material ? { category: material } : {}),
        })
      ).data,
    enabled: Boolean(position),
  });

  const centres = data?.data || [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Where to take it</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Recycling centres and kabadiwalas near you, filtered by what they accept.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setMaterial(null)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-[12.5px] transition-colors",
            !material ? "border-accent bg-accent-tint text-accent" : "border-border hover:bg-secondary",
          )}
        >
          Everything
        </button>
        {MATERIALS.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setMaterial(entry === material ? null : entry)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[12.5px] transition-colors",
              material === entry
                ? "border-accent bg-accent-tint text-accent"
                : "border-border hover:bg-secondary",
            )}
          >
            {MATERIAL_GUIDE[entry].icon} {entry}
          </button>
        ))}
      </div>

      {locating && (
        <Card>
          <CardContent className="flex items-center gap-2 py-4 text-[13px] text-muted-foreground">
            <Crosshair className="h-4 w-4" />
            Finding your location…
          </CardContent>
        </Card>
      )}

      {!locating && !position && (
        <EmptyState
          title="Location needed"
          description="Allow location access so we can show centres near you."
        />
      )}

      {isLoading && position && <LoadingState label="Finding centres" />}
      {isError && (
        <EmptyState title="Could not load centres" description="Check your connection and try again." />
      )}

      {position && !isLoading && centres.length === 0 && (
        <EmptyState
          title="No centres found nearby"
          description={
            material
              ? `Nothing within 25 km accepts ${material}. Try removing the filter.`
              : "Nothing within 25 km. Centre data may not cover this area yet."
          }
        />
      )}

      <div className="space-y-2">
        {centres.map((centre) => (
          <Card key={centre.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[14.5px] font-medium">{centre.name}</div>
                  {centre.address && (
                    <div className="mt-0.5 flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {centre.address}
                        {centre.city ? `, ${centre.city}` : ""}
                      </span>
                    </div>
                  )}
                </div>
                {centre.type && <Badge variant="secondary" className="shrink-0">{centre.type}</Badge>}
              </div>

              {centre.accepts?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {centre.accepts.map((item) => (
                    <Badge key={item} variant="outline" className="font-normal">
                      {item}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                {centre.phone && (
                  <a href={`tel:${centre.phone}`} className="flex items-center gap-1.5 hover:text-accent">
                    <Phone className="h-3.5 w-3.5" />
                    {centre.phone}
                  </a>
                )}
                {centre.hours && <span>{centre.hours}</span>}
                {centre.pricePerKg ? (
                  <span className="flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" />
                    {centre.pricePerKg}/kg
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
