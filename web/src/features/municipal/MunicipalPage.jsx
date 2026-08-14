// The municipal dashboard.
//
// Answers one question for whoever dispatches the trucks: which wards need
// collecting today, and what does routing to only those bins save against driving
// the usual circuit?
//
// The saving shown here is computed the same way as the offline study in
// backend/scripts/routeSimulation.js — against an ordered circuit over every ward,
// not against the naive per-bin round trip, which flatters the number.

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Loader2, Route, TrendingDown } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { binsAPI, errorMessage } from "@/lib/api";

// Pilot area depot.
const DEPOT = { lat: 16.5449, lng: 81.5212, name: "Municipal depot" };

export default function MunicipalPage() {
  const [plan, setPlan] = useState(null);

  const wards = useQuery({
    queryKey: ["municipal-wards"],
    queryFn: async () => (await binsAPI.getWards({ hours: 24 })).data,
  });

  const actionable = useQuery({
    queryKey: ["municipal-actionable"],
    queryFn: async () => (await binsAPI.getActionable({ hours: 24 })).data,
  });

  const runPlan = useMutation({
    mutationFn: async () => (await binsAPI.planRoute({ depot: DEPOT, hours: 24 })).data,
    onSuccess: (data) => {
      setPlan(data);
      if (!data.stops) toast.info("No bins currently need collection.");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not build a route")),
  });

  const wardRows = wards.data?.wards || [];

  const chartData = useMemo(
    () =>
      wardRows.slice(0, 10).map((ward) => ({
        ward: ward.ward.replace(/^W/, ""),
        pressure: Math.round(ward.pressure * 100),
        reports: ward.reports,
      })),
    [wardRows],
  );

  const totals = useMemo(
    () => ({
      wards: wardRows.length,
      reports: wardRows.reduce((sum, w) => sum + w.reports, 0),
      unresolved: wardRows.reduce((sum, w) => sum + w.unresolved, 0),
      critical: wardRows.filter((w) => w.pressure >= 0.66).length,
    }),
    [wardRows],
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Municipal dashboard</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Ward pressure from citizen reports, and today&apos;s collection plan.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Wards reporting", value: totals.wards },
          { label: "Reports (24h)", value: totals.reports },
          { label: "Awaiting collection", value: totals.unresolved },
          { label: "Critical wards", value: totals.critical },
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

      {wards.isLoading && <LoadingState label="Loading ward data" />}
      {!wards.isLoading && wardRows.length === 0 && (
        <EmptyState
          title="No reports in the last 24 hours"
          description="The dashboard fills as citizens report bins."
        />
      )}

      {chartData.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Ward pressure — share of reports needing collection
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="ward" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis unit="%" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="pressure" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[15px] font-medium">Today&apos;s collection plan</div>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {actionable.data?.count ?? 0} bins reported as needing collection.
              </p>
            </div>
            <Button onClick={() => runPlan.mutate()} disabled={runPlan.isPending}>
              {runPlan.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Route className="mr-2 h-4 w-4" />
              )}
              Build route
            </Button>
          </div>

          {plan?.stops > 0 && (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Stops", value: plan.stops },
                  { label: "Routes", value: plan.routes.length },
                  { label: "Distance", value: `${plan.summary.totalDistance} km` },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </div>
                    <div className="mt-0.5 text-[17px] font-semibold tabular-nums">{stat.value}</div>
                  </div>
                ))}
              </div>

              {plan.comparison?.reductionPct !== null && (
                <div className="flex items-start gap-2 rounded-md border border-border bg-secondary px-3 py-2.5">
                  <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div className="text-[13px]">
                    <span className="font-medium">
                      {plan.comparison.reductionPct}% shorter
                    </span>{" "}
                    than the {plan.comparison.fixedCircuitKm} km fixed circuit.
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {plan.comparison.note}
                    </div>
                  </div>
                </div>
              )}

              {plan.routes.map((route) => (
                <div key={route.routeNumber} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-medium">Route {route.routeNumber}</span>
                    <Badge variant="secondary">{route.stops} stops</Badge>
                  </div>
                  <div className="mt-1 text-[12.5px] text-muted-foreground">
                    {route.totalDistance} km · about {route.estimatedTime} min ·{" "}
                    {route.emissions?.co2EmittedKg} kg CO₂
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
