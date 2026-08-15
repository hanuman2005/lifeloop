// Result of segregating a mixed pile.
//
// The headline is the recyclable share, because that is the number a municipality
// acts on: how much of this can be diverted, and is there anything hazardous in
// it that must not go to landfill.
//
// Boxes are drawn over the photograph rather than listed alone, because "three
// plastics and a battery" is not verifiable by a human without seeing which.

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Recycle, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { MATERIAL_GUIDE } from "@/features/scanner/materials";
import { cn } from "@/lib/utils";

// Distinct hues per material so a box can be matched to its row at a glance.
const BOX_COLOUR = {
  Plastic: "#3b82f6",
  Glass: "#06b6d4",
  Metal: "#64748b",
  Paper: "#d97706",
  Organic: "#16a34a",
  Electronic: "#8b5cf6",
  Textile: "#ec4899",
  Wood: "#a16207",
  Hazardous: "#dc2626",
};

export default function SceneResult({ imageUrl, result, onScanAnother }) {
  const imageRef = useRef(null);
  const [natural, setNatural] = useState(null);
  const [hovered, setHovered] = useState(null);

  const items = result.items || [];
  const composition = result.composition || {};

  const recyclablePct = Math.round((composition.recyclableShare || 0) * 100);

  const sorted = useMemo(
    () => Object.entries(composition.byMaterial || {}).sort((a, b) => b[1] - a[1]),
    [composition.byMaterial],
  );

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="relative bg-muted">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Analysed pile"
            className="max-h-[420px] w-full object-contain"
            onLoad={(event) =>
              setNatural({
                width: event.target.naturalWidth,
                height: event.target.naturalHeight,
              })
            }
          />

          {/* Boxes are in original-image pixels; the img is scaled by object-contain,
              so positions are expressed as percentages of the natural size. */}
          {natural &&
            items.map((item, index) =>
              item.box ? (
                <div
                  key={index}
                  className="pointer-events-none absolute border-2 transition-opacity"
                  style={{
                    left: `${(item.box.x1 / natural.width) * 100}%`,
                    top: `${(item.box.y1 / natural.height) * 100}%`,
                    width: `${((item.box.x2 - item.box.x1) / natural.width) * 100}%`,
                    height: `${((item.box.y2 - item.box.y1) / natural.height) * 100}%`,
                    borderColor: BOX_COLOUR[item.material] || "#6b7280",
                    opacity: hovered === null || hovered === index ? 1 : 0.25,
                  }}
                >
                  <span
                    className="absolute -top-[18px] left-0 whitespace-nowrap rounded px-1 text-[10px] font-medium text-white"
                    style={{ backgroundColor: BOX_COLOUR[item.material] || "#6b7280" }}
                  >
                    {item.material}
                  </span>
                </div>
              ) : null,
            )}
        </div>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex items-start gap-3 py-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-[14px] font-medium">Nothing found</div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                No discardable items were detected. Try a closer photo with the items
                more clearly separated.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onScanAnother}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[19px] font-semibold tracking-tight">
                    {composition.total} item{composition.total === 1 ? "" : "s"} found
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {result.mode === "detected"
                      ? "Each item detected and classified separately."
                      : "No detector available — the whole frame was classified as one item."}
                  </p>
                </div>
                {composition.hazardousCount > 0 && (
                  <Badge variant="outline" className="shrink-0 border-red-300 bg-red-50 text-red-800">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {composition.hazardousCount} hazardous
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 font-mono uppercase tracking-wider text-muted-foreground">
                    <Recycle className="h-3.5 w-3.5" />
                    Recyclable
                  </span>
                  <span className="font-medium tabular-nums">{recyclablePct}%</span>
                </div>
                <Progress value={recyclablePct} className="h-2" />
                <p className="pt-0.5 text-[12.5px] text-muted-foreground">
                  Counted by item, not by volume — a box in a photograph does not measure
                  how much of the bin something fills.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                {sorted.map(([material, count]) => (
                  <div key={material} className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: BOX_COLOUR[material] || "#6b7280" }}
                    />
                    <span className="w-6 text-center text-[15px]">
                      {MATERIAL_GUIDE[material]?.icon || "📦"}
                    </span>
                    <span className="flex-1 text-[13.5px]">{material}</span>
                    <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Every item
            </div>
            {items.map((item, index) => (
              <Card
                key={index}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                className={cn("transition-shadow", hovered === index && "shadow-card-hover")}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <span
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: BOX_COLOUR[item.material] || "#6b7280" }}
                  />
                  <span className="w-7 text-center text-[17px]">
                    {MATERIAL_GUIDE[item.material]?.icon || "📦"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-medium">{item.material}</span>
                      {item.uncertain && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                          not sure
                        </Badge>
                      )}
                      {item.isRecyclable === false && (
                        <Badge variant="secondary">not recyclable</Badge>
                      )}
                    </div>
                    {item.reasoning && (
                      <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted-foreground">
                        {item.reasoning}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-muted-foreground">
                    {item.confidence}%
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={onScanAnother}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Scan another
          </Button>
        </>
      )}
    </div>
  );
}
