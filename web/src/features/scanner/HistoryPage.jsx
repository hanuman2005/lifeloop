// Everything the user has scanned.
//
// Doubles as the ward-level waste-composition record the synopsis calls the
// project's data-science contribution: each saved scan is one labelled
// observation of what this area actually throws away.

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { errorMessage, wasteAnalysisAPI } from "@/lib/api";
import { MATERIAL_GUIDE } from "@/features/scanner/materials";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HistoryPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["scan-history"],
    queryFn: async () => (await wasteAnalysisAPI.myHistory({ limit: 60 })).data,
  });

  const remove = useMutation({
    mutationFn: (id) => wasteAnalysisAPI.remove(id),
    onSuccess: () => {
      toast.success("Removed");
      queryClient.invalidateQueries({ queryKey: ["scan-history"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not remove that scan")),
  });

  const analyses = data?.analyses || [];

  // A running composition profile: what this person's waste is actually made of.
  const composition = useMemo(() => {
    const counts = analyses.reduce((accumulator, entry) => {
      const key = entry.material || "Other";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});
    const total = analyses.length || 1;
    return Object.entries(counts)
      .map(([material, count]) => ({ material, count, share: count / total }))
      .sort((a, b) => b.count - a.count);
  }, [analyses]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Scan history</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            What you have scanned, and what it says about your waste.
          </p>
        </div>
        <Button asChild>
          <Link to="/scan"><Camera className="mr-2 h-4 w-4" />Scan an item</Link>
        </Button>
      </header>

      {isLoading && <LoadingState label="Loading your scans" />}
      {isError && (
        <EmptyState title="Could not load your history" description="Check your connection and try again." />
      )}

      {!isLoading && !isError && analyses.length === 0 && (
        <EmptyState
          title="Nothing scanned yet"
          description="Scan an item to find out what it is made of and what to do with it."
          action={<Button asChild><Link to="/scan">Scan an item</Link></Button>}
        />
      )}

      {composition.length > 0 && (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Your waste composition · {analyses.length} scans
            </div>
            <div className="space-y-2">
              {composition.map((row) => (
                <div key={row.material} className="flex items-center gap-3">
                  <span className="w-6 text-center text-[15px]">
                    {MATERIAL_GUIDE[row.material]?.icon || "📦"}
                  </span>
                  <span className="w-24 shrink-0 text-[13px]">{row.material}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.round(row.share * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                    {Math.round(row.share * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {analyses.map((entry) => (
          <Card key={entry._id}>
            <CardContent className="flex items-center gap-3 py-3.5">
              <span className="w-8 shrink-0 text-center text-[18px]">
                {MATERIAL_GUIDE[entry.material]?.icon || "📦"}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[14px] font-medium">
                    {entry.tfLabel || entry.material}
                  </span>
                  <Badge variant="secondary">{entry.material}</Badge>
                  {entry.analysisCount > 1 && (
                    <Badge variant="outline">seen {entry.analysisCount}×</Badge>
                  )}
                </div>
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {formatDate(entry.lastAnalyzedAt || entry.createdAt)}
                  {entry.confidence ? ` · ${Math.round(entry.confidence)}% confident` : ""}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground"
                onClick={() => remove.mutate(entry._id)}
                aria-label="Remove scan"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
