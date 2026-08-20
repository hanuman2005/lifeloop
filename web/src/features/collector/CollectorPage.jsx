// M4 — the collector's working screen.
//
// Used on a cycle cart or on foot, so the list is ordered by distance and every
// action is a single large tap. The work record is shown alongside, because the
// verifiable history is the reason a collector would use this at all.

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Crosshair, Loader2, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { collectorAPI, errorMessage } from "@/lib/api";

const PRIORITY_LABEL = { 3: "Overflowing", 2: "Full", 1: "Routine" };
const PRIORITY_TONE = {
  3: "border-red-300 bg-red-50 text-red-800",
  2: "border-amber-300 bg-amber-50 text-amber-800",
  1: "border-border bg-secondary text-muted-foreground",
};

function CompleteForm({ task, onDone }) {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [notes, setNotes] = useState("");

  const complete = useMutation({
    mutationFn: () =>
      collectorAPI.complete(task._id, {
        beforePhotoUrl: before.trim(),
        afterPhotoUrl: after.trim(),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Marked complete. Awaiting citizen confirmation.");
      onDone();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not complete the task")),
  });

  return (
    <div className="space-y-2.5 border-t border-border pt-3">
      <p className="text-[12.5px] text-muted-foreground">
        Both photographs are required. A citizen confirms the work before it reaches your
        record.
      </p>
      <Input placeholder="Before photo URL" value={before} onChange={(e) => setBefore(e.target.value)} />
      <Input placeholder="After photo URL" value={after} onChange={(e) => setAfter(e.target.value)} />
      <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Button
        size="sm"
        className="w-full"
        disabled={!before.trim() || !after.trim() || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {complete.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        Submit for verification
      </Button>
    </div>
  );
}

export default function CollectorPage() {
  const queryClient = useQueryClient();
  const [position, setPosition] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setPosition(null),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  const nearby = useQuery({
    queryKey: ["collector-nearby", position?.lat, position?.lng],
    queryFn: async () =>
      (await collectorAPI.getNearbyTasks({ lat: position.lat, lng: position.lng, radius: 10 })).data,
    enabled: Boolean(position),
  });

  const mine = useQuery({
    queryKey: ["collector-mine"],
    queryFn: async () => (await collectorAPI.getMyTasks()).data,
  });

  const ledger = useQuery({
    queryKey: ["collector-ledger"],
    queryFn: async () => (await collectorAPI.getLedger()).data,
  });

  const generate = useMutation({
    mutationFn: () => collectorAPI.generateTasks({ hours: 24 }),
    onSuccess: ({ data }) => {
      toast.success(`${data.created} new task${data.created === 1 ? "" : "s"} queued`);
      queryClient.invalidateQueries({ queryKey: ["collector-nearby"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not generate tasks")),
  });

  const accept = useMutation({
    mutationFn: (id) => collectorAPI.accept(id),
    onSuccess: () => {
      toast.success("Task accepted");
      queryClient.invalidateQueries({ queryKey: ["collector-nearby"] });
      queryClient.invalidateQueries({ queryKey: ["collector-mine"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not accept the task")),
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["collector-mine"] });
    queryClient.invalidateQueries({ queryKey: ["collector-ledger"] });
    setExpanded(null);
  };

  const openTasks = nearby.data?.tasks || [];
  const myTasks = mine.data?.tasks || [];
  const integrity = ledger.data?.integrity;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Collection work</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Tasks near you, and your verified work record.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
          {generate.isPending ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-3.5 w-3.5" />
          )}
          Find new work
        </Button>
      </header>

      <Tabs defaultValue="available">
        <TabsList className="w-full">
          <TabsTrigger value="available" className="flex-1">
            <Crosshair className="mr-1.5 h-3.5 w-3.5" />
            Available
          </TabsTrigger>
          <TabsTrigger value="mine" className="flex-1">
            <Package className="mr-1.5 h-3.5 w-3.5" />
            Mine
          </TabsTrigger>
          <TabsTrigger value="record" className="flex-1">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Record
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-2 pt-4">
          {!position && (
            <Card>
              <CardContent className="flex items-center gap-2 py-4 text-[13px] text-muted-foreground">
                <Crosshair className="h-4 w-4" />
                Waiting for your location to sort tasks by distance.
              </CardContent>
            </Card>
          )}
          {nearby.isLoading && <LoadingState label="Finding work nearby" />}
          {position && !nearby.isLoading && openTasks.length === 0 && (
            <EmptyState
              title="No open tasks nearby"
              description="Tap Find new work to queue tasks from bins that citizens have reported."
            />
          )}
          {openTasks.map((task) => (
            <Card key={task._id}>
              <CardContent className="flex items-center gap-3 py-3.5">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium">{task.ward || "Unmapped"}</span>
                    <Badge variant="outline" className={PRIORITY_TONE[task.priority]}>
                      {PRIORITY_LABEL[task.priority] || "Task"}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-[12.5px] tabular-nums text-muted-foreground">
                    {task.location.coordinates[1].toFixed(4)}, {task.location.coordinates[0].toFixed(4)}
                  </div>
                </div>
                <Button size="sm" onClick={() => accept.mutate(task._id)} disabled={accept.isPending}>
                  Accept
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="mine" className="space-y-2 pt-4">
          {mine.isLoading && <LoadingState label="Loading your tasks" />}
          {!mine.isLoading && myTasks.length === 0 && (
            <EmptyState title="No tasks yet" description="Accept a task to get started." />
          )}
          {myTasks.map((task) => (
            <Card key={task._id}>
              <CardContent className="space-y-2 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[14px] font-medium">{task.ward || "Unmapped"}</span>
                  <Badge variant="outline">{task.status}</Badge>
                </div>

                {task.status === "assigned" && (
                  <>
                    {expanded === task._id ? (
                      <CompleteForm task={task} onDone={refreshAll} />
                    ) : (
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setExpanded(task._id)}>
                        Mark as collected
                      </Button>
                    )}
                  </>
                )}

                {task.status === "completed" && (
                  <p className="text-[12.5px] text-muted-foreground">
                    Waiting for a citizen to confirm. It reaches your record once confirmed.
                  </p>
                )}

                {task.status === "verified" && (
                  <p className="flex items-center gap-1.5 text-[12.5px] text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified and recorded
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="record" className="space-y-3 pt-4">
          {ledger.isLoading && <LoadingState label="Loading your record" />}

          {integrity && (
            <Card>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      className={integrity.valid ? "h-4 w-4 text-green-600" : "h-4 w-4 text-destructive"}
                    />
                    <span className="text-[14px] font-medium">
                      {ledger.data.totalTasks} verified task
                      {ledger.data.totalTasks === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      integrity.valid
                        ? "border-green-300 bg-green-50 text-green-800"
                        : "border-red-300 bg-red-50 text-red-800"
                    }
                  >
                    {integrity.valid ? "Record intact" : "Tampering detected"}
                  </Badge>
                </div>
                <p className="text-[12.5px] text-muted-foreground">
                  Each entry is chained to the one before it, so the record cannot be altered
                  after the fact. This check runs every time the record is opened.
                </p>
                {!integrity.valid && (
                  <p className="text-[12.5px] text-destructive">
                    Chain broken at entry {integrity.brokenAt}: {integrity.reason}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {(ledger.data?.entries || []).map((entry) => (
            <Card key={entry._id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    #{entry.sequence}
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">
                    {new Date(entry.completedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 text-[13.5px]">{entry.ward || "Unmapped"}</div>
                <Separator className="my-2" />
                <div className="truncate font-mono text-[10.5px] text-muted-foreground">
                  {entry.hash}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
