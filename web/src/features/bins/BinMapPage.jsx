// M2 — the live ward map.
//
// Wards are coloured by weighted pressure rather than raw report counts, so one
// unreliable account cannot turn an area red. Circle radius encodes volume and
// colour encodes pressure, which keeps a busy ward with healthy bins visually
// distinct from a quiet ward with overflowing ones.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import { RefreshCw } from "lucide-react";
import "leaflet/dist/leaflet.css";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { binsAPI } from "@/lib/api";

// Bhimavaram — the pilot area. Only used when there is no data to centre on.
const FALLBACK_CENTRE = [16.5449, 81.5212];

const WINDOWS = [
  { hours: 6, label: "6h" },
  { hours: 24, label: "24h" },
  { hours: 72, label: "3d" },
];

/** Green through amber to red as the share of bins needing collection rises. */
function pressureColour(pressure) {
  if (pressure >= 0.66) return "#dc2626";
  if (pressure >= 0.33) return "#d97706";
  return "#16a34a";
}

export default function BinMapPage() {
  const [hours, setHours] = useState(24);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["bin-wards", hours],
    queryFn: async () => (await binsAPI.getWards({ hours })).data,
    // The map is glanced at, not stared at; polling every half minute is enough
    // and avoids hammering the aggregation pipeline.
    refetchInterval: 30_000,
  });

  const wards = data?.wards || [];

  const centre = useMemo(() => {
    if (!wards.length) return FALLBACK_CENTRE;
    const lat = wards.reduce((sum, w) => sum + w.centre.lat, 0) / wards.length;
    const lng = wards.reduce((sum, w) => sum + w.centre.lng, 0) / wards.length;
    return [lat, lng];
  }, [wards]);

  const totals = useMemo(
    () => ({
      reports: wards.reduce((sum, w) => sum + w.reports, 0),
      unresolved: wards.reduce((sum, w) => sum + w.unresolved, 0),
      critical: wards.filter((w) => w.pressure >= 0.66).length,
    }),
    [wards],
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Waste map</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Built from citizen reports. No sensors.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {WINDOWS.map((option) => (
            <Button
              key={option.hours}
              size="sm"
              variant={hours === option.hours ? "default" : "outline"}
              onClick={() => setHours(option.hours)}
            >
              {option.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Wards", value: wards.length },
          { label: "Reports", value: totals.reports },
          { label: "Need collection", value: totals.unresolved },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-3.5">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </div>
              <div className="mt-0.5 text-[20px] font-semibold tabular-nums">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading && <LoadingState label="Loading the map" />}
      {isError && (
        <EmptyState title="Could not load the map" description="Check your connection and try again." />
      )}

      {!isLoading && !isError && wards.length === 0 && (
        <EmptyState
          title="No reports yet"
          description={`Nothing has been reported in the last ${hours} hours. Report a bin to put the first point on the map.`}
        />
      )}

      {wards.length > 0 && (
        <Card className="overflow-hidden">
          <MapContainer
            center={centre}
            zoom={13}
            scrollWheelZoom
            style={{ height: 420, width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {wards.map((ward) => (
              <CircleMarker
                key={ward.ward}
                center={[ward.centre.lat, ward.centre.lng]}
                // Radius encodes volume, colour encodes pressure. Square-rooted so
                // a ward with 50 reports does not swamp one with 5.
                radius={Math.min(28, 8 + Math.sqrt(ward.reports) * 4)}
                pathOptions={{
                  color: pressureColour(ward.pressure),
                  fillColor: pressureColour(ward.pressure),
                  fillOpacity: 0.35,
                  weight: 2,
                }}
              >
                <Tooltip direction="top">{Math.round(ward.pressure * 100)}% need collection</Tooltip>
                <Popup>
                  <div className="space-y-1 text-[13px]">
                    <div className="font-medium">{ward.ward}</div>
                    <div>{ward.reports} reports</div>
                    <div>{ward.unresolved} awaiting collection</div>
                    <div>{ward.overflowing} overflowing</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground">
        <span className="font-mono text-[11px] uppercase tracking-wider">Pressure</span>
        {[
          { colour: "#16a34a", label: "Low" },
          { colour: "#d97706", label: "Moderate" },
          { colour: "#dc2626", label: "High" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.colour }} />
            {item.label}
          </span>
        ))}
        {totals.critical > 0 && (
          <Badge variant="outline" className="ml-auto border-red-300 bg-red-50 text-red-700">
            {totals.critical} ward{totals.critical === 1 ? "" : "s"} critical
          </Badge>
        )}
      </div>
    </div>
  );
}
