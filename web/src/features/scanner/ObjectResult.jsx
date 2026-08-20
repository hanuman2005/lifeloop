// web/src/features/scanner/ObjectResult.jsx
// Displays the result of everyday-object detection (YOLOv8n-COCO).

import { useMemo } from "react";
import { AlertTriangle, RefreshCcw, Recycle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WASTE_LABEL = {
  Plastic: "Recyclable",
  Glass: "Recyclable",
  Metal: "Scrap value",
  Paper: "Recyclable",
  Organic: "Compostable",
  Electronic: "E-waste",
  Textile: "Donate/recycle",
  Wood: "Reuse/compost",
  Hazardous: "Hazardous",
  Ceramic: "Non-recyclable",
};

export default function ObjectResult({ imageUrl, result, onScanAnother }) {
  const items = useMemo(() => result.items || [], [result]);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-[15px] font-semibold">
              Detected {items.length} object{items.length !== 1 ? "s" : ""}
            </CardTitle>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {result.mode === "coco"
                ? "Everyday object detection (YOLOv8n-COCO)"
                : result.mode}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={onScanAnother}
          >
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Scan again
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.length === 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="text-[14px] font-medium">No objects detected</div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Try pointing the camera at a clearer photo with everyday items
                like phones, laptops, books, or bottles.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-2.5">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50"
            >
              <span className="text-2xl" aria-hidden>
                {item.emoji || "📦"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium capitalize">
                    {item.label}
                  </span>
                  {item.wasteCategory && (
                    <Badge variant="secondary" className="text-[11px] h-5 px-1.5">
                      <Recycle className="mr-1 h-3 w-3" />
                      {WASTE_LABEL[item.wasteCategory] || item.wasteCategory}
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {item.name} · {item.confidence}% confidence
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
