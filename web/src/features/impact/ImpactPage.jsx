// Personal standing plus the citizen's contribution to the crowd-sensing network.
//
// Bin-reporting standing lives here rather than on the report screen: showing your
// weight while you report invites gaming it, whereas showing it alongside impact
// frames it as a record of contribution.

import { useQuery } from "@tanstack/react-query";
import { Award, Leaf, Recycle, ShieldCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/shared/components/LoadingState";
import { binsAPI, ecoAPI } from "@/lib/api";

function Stat({ icon: Icon, label, value, suffix }) {
  return (
    <Card>
      <CardContent className="py-4">
        <Icon className="h-4 w-4 text-accent" />
        <div className="mt-2 text-[22px] font-semibold tabular-nums leading-none">
          {value}
          {suffix && <span className="ml-1 text-[13px] font-normal text-muted-foreground">{suffix}</span>}
        </div>
        <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
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

  if (eco.isLoading) return <LoadingState label="Loading your impact" />;

  // The endpoint has been seen to return the record at the root and under `eco`,
  // so normalise rather than depending on one shape.
  const record = eco.data?.eco || eco.data || {};
  const stats = record.stats || {};
  const standing = bins.data?.standing;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Your impact</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          What your scanning, giving and reporting has added up to.
        </p>
      </header>

      {record.level && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Level
              </div>
              <div className="mt-0.5 text-[17px] font-medium">{record.level}</div>
            </div>
            <div className="text-right">
              <div className="text-[24px] font-semibold tabular-nums leading-none">
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
        <Stat icon={Recycle} label="Items scanned" value={stats.totalScans ?? 0} />
        <Stat icon={Trash2} label="Bins reported" value={stats.totalBinReports ?? 0} />
        <Stat icon={Award} label="Donations" value={stats.totalDonations ?? 0} />
        <Stat
          icon={Leaf}
          label="CO₂ saved"
          value={Number(stats.co2Saved ?? 0).toFixed(1)}
          suffix="kg"
        />
      </div>

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
              {standing.accepted} of {standing.total} of your bin reports were accepted. Reports
              from consistently accurate reporters carry more weight on the ward map.
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
    </div>
  );
}
