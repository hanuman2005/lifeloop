// Pickup scheduling.
//
// A schedule is proposed by one side and confirmed by the other, so the screen is
// organised by what the viewer can act on rather than by date: anything awaiting
// their response comes first.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { errorMessage, schedulesAPI } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";

const STATUS_TONE = {
  proposed: "border-amber-300 bg-amber-50 text-amber-800",
  confirmed: "border-green-300 bg-green-50 text-green-800",
  completed: "border-slate-300 bg-slate-100 text-slate-700",
  cancelled: "border-slate-300 bg-slate-100 text-slate-500",
  expired: "border-slate-300 bg-slate-100 text-slate-500",
};

function formatWhen(value) {
  if (!value) return "Time not set";
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SchedulesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => (await schedulesAPI.mine()).data,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["schedules"] });

  const confirm = useMutation({
    mutationFn: (id) => schedulesAPI.confirm(id),
    onSuccess: () => { toast.success("Pickup confirmed"); refresh(); },
    onError: (error) => toast.error(errorMessage(error, "Could not confirm")),
  });

  const cancel = useMutation({
    mutationFn: (id) => schedulesAPI.cancel(id, { reason: "Cancelled from the app" }),
    onSuccess: () => { toast.success("Pickup cancelled"); refresh(); },
    onError: (error) => toast.error(errorMessage(error, "Could not cancel")),
  });

  const schedules = data?.schedules || data?.data || [];

  // Anything proposed by the other party is waiting on this user.
  const awaitingMe = schedules.filter(
    (schedule) =>
      schedule.status === "proposed" &&
      String(schedule.proposedBy?._id || schedule.proposedBy) !== String(user?._id),
  );
  const rest = schedules.filter((schedule) => !awaitingMe.includes(schedule));

  function ScheduleCard({ schedule, actionable }) {
    const when = schedule.proposedDateTime || schedule.scheduledDate;
    return (
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[14.5px] font-medium">
                {schedule.listing?.title || "Pickup"}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                {formatWhen(when)}
              </div>
              {schedule.pickupLocation && (
                <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{schedule.pickupLocation}</span>
                </div>
              )}
            </div>
            <Badge variant="outline" className={cn("shrink-0", STATUS_TONE[schedule.status])}>
              {schedule.status}
            </Badge>
          </div>

          {actionable && (
            <div className="flex gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => confirm.mutate(schedule._id)}
                disabled={confirm.isPending}
              >
                {confirm.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-2 h-3.5 w-3.5" />
                )}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => cancel.mutate(schedule._id)}
                disabled={cancel.isPending}
              >
                <X className="mr-2 h-3.5 w-3.5" />
                Decline
              </Button>
            </div>
          )}

          {schedule.status === "confirmed" && (
            <p className="border-t border-border pt-3 text-[12.5px] text-muted-foreground">
              Confirmed. At the pickup, the donor shows a code and the recipient scans it
              on the Handover screen.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Pickups</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Times proposed for collecting items, and what needs your answer.
        </p>
      </header>

      {isLoading && <LoadingState label="Loading pickups" />}
      {isError && (
        <EmptyState title="Could not load pickups" description="Check your connection and try again." />
      )}

      {!isLoading && !isError && schedules.length === 0 && (
        <EmptyState
          title="No pickups yet"
          description="Once an item is assigned, either side can propose a time to collect it."
        />
      )}

      {awaitingMe.length > 0 && (
        <section className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Waiting for your answer
          </div>
          {awaitingMe.map((schedule) => (
            <ScheduleCard key={schedule._id} schedule={schedule} actionable />
          ))}
        </section>
      )}

      {rest.length > 0 && (
        <section className="space-y-2">
          {awaitingMe.length > 0 && (
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Everything else
            </div>
          )}
          {rest.map((schedule) => (
            <ScheduleCard key={schedule._id} schedule={schedule} />
          ))}
        </section>
      )}
    </div>
  );
}
