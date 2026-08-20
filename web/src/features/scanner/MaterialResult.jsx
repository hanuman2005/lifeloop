// The scan result card.
//
// Presents an uncertain prediction differently from a confident one. The model
// abstains below its calibrated per-class threshold, and the UI has to respect
// that: showing a hedged guess with the same styling as a confident answer is
// how users end up trusting something the model never claimed.

import { CheckCircle2, HelpCircle, Recycle, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { URGENCY_LABEL } from "@/features/scanner/materials";
import { cn } from "@/lib/utils";

export default function MaterialResult({ analysis, guide, onScanAnother, onCreateListing }) {
  const uncertain = Boolean(analysis.uncertain);

  return (
    <Card className={cn("overflow-hidden", uncertain && "border-amber-300 shadow-sm")}>
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-2xl transition-all",
              guide?.tone || "border-border bg-muted",
            )}
          >
            {guide?.icon || "📦"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-semibold tracking-tight">{analysis.material}</h2>
              {uncertain ? (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  <HelpCircle className="mr-1 h-3 w-3" />
                  Not sure
                </Badge>
              ) : (
                <Badge variant="outline" className="border-green-300 bg-green-50 text-green-800">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Identified
                </Badge>
              )}
              {analysis.engine === "gemini" && (
                <Badge variant="outline" className="font-mono text-[10px] uppercase border-accent/30 bg-accent-tint text-accent">
                  fallback
                </Badge>
              )}
            </div>

            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{analysis.reasoning}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">Confidence</span>
            <span className="font-medium tabular-nums text-[15px]">{analysis.confidence}%</span>
          </div>
          <Progress value={Number(analysis.confidence) || 0} className="h-2" />
          {uncertain && (
            <p className="pt-1 text-[12.5px] text-amber-700">
              Below the threshold for this class. Treat it as a best guess and check the
              material yourself before acting on it.
            </p>
          )}
        </div>

        {Array.isArray(analysis.topK) && analysis.topK.length > 1 && (
          <div className="space-y-1.5">
            <div className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
              Other possibilities
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.topK.slice(1).map((entry) => (
                <Badge key={entry.material} variant="secondary" className="font-normal">
                  {entry.material}
                  <span className="ml-1.5 tabular-nums text-muted-foreground">
                    {Math.round(entry.probability * 100)}%
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-secondary/50 p-3.5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Status</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={analysis.isRecyclable ? "default" : "secondary"}>
                <Recycle className="mr-1 h-3 w-3" />
                {analysis.isRecyclable ? "Recyclable" : "Not recyclable"}
              </Badge>
              {analysis.urgency && (
                <Badge variant="outline">{URGENCY_LABEL[analysis.urgency] || analysis.urgency}</Badge>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/50 p-3.5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Disposal</div>
            <p className="text-[13px] leading-relaxed">{guide?.disposal || "Check local guidelines."}</p>
          </div>
        </div>

        {guide?.reuse?.length > 0 && (
          <div className="rounded-lg border border-border bg-secondary/30 p-3.5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Before you discard it</div>
            <ul className="space-y-1.5">
              {guide.reuse.map((idea) => (
                <li key={idea} className="flex gap-2 text-[13.5px]">
                  <span className="text-accent mt-0.5">•</span>
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={onCreateListing} className="shadow-sm">
            Give it away instead
          </Button>
          <Button variant="outline" onClick={onScanAnother}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Scan another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
