// Shown to the donor on their own listing: who wants the item, and choosing one.
//
// The queue is ordered by when people joined, and that order is shown rather than
// hidden, because "first in line" is the fairness rule the recipient was told
// applies. The donor can still pick anyone — the order is information, not a
// constraint — but departing from it should be a visible choice.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Star, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/shared/components/LoadingState";
import { errorMessage, listingsAPI } from "@/lib/api";

function initials(person) {
  return [person?.firstName?.[0], person?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";
}

export default function InterestedUsers({ listing }) {
  const queryClient = useQueryClient();
  const listingId = listing._id;

  const { data, isLoading } = useQuery({
    queryKey: ["queue", listingId],
    queryFn: async () => (await listingsAPI.getQueueStatus(listingId)).data,
  });

  const assign = useMutation({
    mutationFn: (recipientId) => listingsAPI.assign(listingId, { recipientId }),
    onSuccess: () => {
      toast.success("Assigned. They have been notified and can now arrange a pickup.");
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["queue", listingId] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not assign the item")),
  });

  if (isLoading) return <LoadingState label="Loading interested people" />;

  const queue = data?.queue || [];
  const assignedId = listing.assignedTo?._id || listing.assignedTo;

  if (queue.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-[14px] font-medium">Nobody has asked yet</div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            You will be notified when someone wants this item.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Interested ({queue.length})
        </span>
        {data?.queueLimit ? (
          <span className="text-[12px] text-muted-foreground">
            limit {data.queueLength}/{data.queueLimit}
          </span>
        ) : null}
      </div>

      {queue.map((entry, index) => {
        const person = entry.user || {};
        const personId = person._id || entry.user;
        const isAssigned = assignedId && String(assignedId) === String(personId);

        return (
          <Card key={personId || index}>
            <CardContent className="flex items-center gap-3 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[13px] font-medium">
                {initials(person)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium">
                    {[person.firstName, person.lastName].filter(Boolean).join(" ") || "Someone"}
                  </span>
                  {index === 0 && !isAssigned && (
                    <Badge variant="secondary" className="shrink-0">First in line</Badge>
                  )}
                  {isAssigned && (
                    <Badge variant="outline" className="shrink-0 border-green-300 bg-green-50 text-green-800">
                      Assigned
                    </Badge>
                  )}
                </div>
                {person.rating ? (
                  <div className="mt-0.5 flex items-center gap-1 text-[12.5px] text-muted-foreground">
                    <Star className="h-3 w-3" />
                    {Number(person.rating).toFixed(1)}
                  </div>
                ) : (
                  <div className="mt-0.5 text-[12.5px] text-muted-foreground">No ratings yet</div>
                )}
              </div>

              {!assignedId && (
                <Button
                  size="sm"
                  onClick={() => assign.mutate(personId)}
                  disabled={assign.isPending}
                >
                  {assign.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="mr-2 h-3.5 w-3.5" />
                  )}
                  Choose
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
