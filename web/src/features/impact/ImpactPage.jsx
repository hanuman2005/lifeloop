// Personal standing plus the citizen's contribution to the crowd-sensing network.
//
// Bin-reporting standing lives here rather than on the report screen: showing your
// weight while you report invites gaming it, whereas showing it alongside impact
// frames it as a record of contribution.
//
// The material breakdown is the centrepiece. This is a segregation product, so what
// a person has actually sorted says more than a points total does, and the colours
// are the same ones the scanner uses to label a result.

import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Leaf,
  Recycle,
  ShieldCheck,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/shared/components/LoadingState";
import { PageHeader } from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import { binsAPI, ecoAPI, wasteAnalysisAPI } from "@/lib/api";
import { MATERIAL_GUIDE } from "@/features/scanner/materials";

// Same hues the scan result uses, so a material means the same thing everywhere.
const MATERIAL_COLOUR = {
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

const ACTION_LABEL = {
  scan: "Scanned an item",
  bin_report: "Reported a bin",
  donate: "Gave an item away",
  pickup: "Completed a pickup",
  reuse: "Logged a reuse project",
};

/**
 * A horizontal bar per material rather than a pie chart. With nine categories a
 * pie is unreadable, and the question a person asks here — which material do I
 * throw away most — is a ranking question, which bars answer directly.
 */
function MaterialBreakdown({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (!total) return null;

  const sorted = [...rows].sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center gap-2">
          <Recycle className="h-4 w-4 text-accent" />
          <span className="text-[14.5px] font-medium">What you have sorted</span>
        </div>

        <div className="mt-4 space-y-2.5">
          {sorted.map((row) => {
            const share = (row.count / total) * 100;
            return (
              <div key={row.material} className="flex items-center gap-3">
                <div className="w-24 shrink-0 text-[13px]">
                  <span className="mr-1.5">{MATERIAL_GUIDE[row.material]?.icon}</span>
                  {row.material}
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${share}%`,
                      backgroundColor: MATERIAL_COLOUR[row.material] || "#94a3b8",
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                  {row.count}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[12.5px] text-muted-foreground">
          {total} {total === 1 ? "item" : "items"} identified across{" "}
          {sorted.length} {sorted.length === 1 ? "material" : "materials"}.
        </p>
      </CardContent>
    </Card>
  );
}

function Activity({ entries }) {
  if (!entries.length) return null;

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          <span className="text-[14.5px] font-medium">Recent activity</span>
        </div>

        <ul className="mt-3 divide-y divide-border">
          {entries.slice(0, 8).map((entry) => (
            <li key={entry._id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-[13.5px]">
                  {ACTION_LABEL[entry.action] || entry.description || entry.action}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
              <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-accent">
                +{entry.points}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function ImpactPage() {
  const eco = useQuery({
    queryKey: ["eco-points"],
    queryFn: async () => (await ecoAPI.getMyPoints()).data,
  });

  const bins = useQuery({
    queryKey: ["my-bin-reports"],
    queryFn: async () => (await binsAPI.getMyReports()).data,
  });

  const analyses = useQuery({
    queryKey: ["my-waste-impact"],
    queryFn: async () => (await wasteAnalysisAPI.myImpact()).data,
  });

  if (eco.isLoading) return <LoadingState label="Loading your impact" />;

  // The controller wraps its payload as { success, data }. Reading eco.data
  // directly gave the envelope, so record.stats was undefined and every figure on
  // this page rendered as zero — while the standing card below, on a different
  // endpoint, correctly reported twenty accepted reports on the same screen.
  const record = eco.data?.data || eco.data?.eco || eco.data || {};
  const stats = record.stats || {};
  const standing = bins.data?.standing;

  const impact = analyses.data || {};
  const materials = (impact.materialBreakdown || [])
    .filter((row) => row._id)
    .map((row) => ({ material: row._id, count: row.count }));

  // Every figure comes from the collection that holds the records, not from the
  // eco-points counters, which are incremented per award and drift from it. This
  // page previously read "3 bins reported" directly above "20 of 20 of your bin
  // reports were accepted", because those two numbers came from different places.
  const scanCount = impact.totalAnalyses ?? stats.totalScans ?? 0;
  const binCount = standing?.total ?? stats.totalBinReports ?? 0;
  const co2 = impact.totalCarbonSaved ?? stats.co2Saved ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your impact"
        description="What your scanning, giving and reporting has added up to."
      />

      {record.level && (
        <Card className="overflow-hidden border-accent/20 bg-accent-tint/40">
          <CardContent className="flex items-center justify-between gap-3 py-5">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Level
              </div>
              <div className="mt-1 text-[17px] font-medium">{record.level}</div>
            </div>
            <div className="text-right">
              <div className="text-[28px] font-bold leading-none tabular-nums text-accent">
                {record.totalPoints ?? 0}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                points
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard icon={Recycle} label="Items scanned" value={scanCount} />
        <StatCard icon={Trash2} label="Bins reported" value={binCount} />
        <StatCard icon={Award} label="Given away" value={stats.totalDonations ?? 0} />
        <StatCard
          icon={Leaf}
          label="CO₂ saved"
          value={Number(co2).toFixed(1)}
          suffix="kg"
        />
      </div>

      <MaterialBreakdown rows={materials} />

      {standing && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span className="text-[14.5px] font-medium">Reporting standing</span>
              </div>
              {standing.sentinel && (
                <Badge variant="outline" className="border-accent bg-accent-tint text-accent">
                  Sentinel
                </Badge>
              )}
            </div>

            <p className="text-[13px] text-muted-foreground">
              {standing.accepted} of {standing.total} of your bin reports were accepted.
              Reports from consistently accurate reporters carry more weight on the ward
              map.
            </p>

            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  // Weight runs 0.2–3; show it as a share of the maximum.
                  style={{ width: `${Math.min(100, (standing.weight / 3) * 100)}%` }}
                />
              </div>
              <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                {standing.weight}×
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Activity entries={record.recentTransactions || []} />
    </div>
  );
}
