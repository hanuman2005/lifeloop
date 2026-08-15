// Notification bell for the app shell.
//
// The unread count is polled and also updated from the socket. Polling alone is
// laggy; the socket alone silently drifts if a message is missed while the tab is
// backgrounded, so both are used and the socket simply invalidates the query.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { notificationsAPI } from "@/lib/api";
import { useSocketEvent } from "@/features/realtime/SocketContext";
import { cn } from "@/lib/utils";

function timeAgo(value) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const unread = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => (await notificationsAPI.unreadCount()).data,
    refetchInterval: 60_000,
  });

  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await notificationsAPI.list({ limit: 20 })).data,
    enabled: open,
  });

  // A live message should bump the badge immediately rather than waiting for the
  // next poll.
  useSocketEvent("newNotification", (payload) => {
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    if (payload?.message) toast(payload.message);
  });

  const markAll = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  // The endpoint has been seen to return the count at several keys; normalise
  // rather than depending on one shape.
  const count =
    unread.data?.count ?? unread.data?.unreadCount ?? unread.data?.data?.count ?? 0;

  const items = list.data?.notifications || list.data?.data || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-[13.5px] font-medium">Notifications</span>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-[12px]" onClick={() => markAll.mutate()}>
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />

        <ScrollArea className="max-h-80">
          {items.length === 0 && (
            <div className="px-3 py-8 text-center text-[13px] text-muted-foreground">
              Nothing yet.
            </div>
          )}
          {items.map((item) => (
            <div
              key={item._id}
              className={cn(
                "border-b border-border px-3 py-2.5 last:border-0",
                !item.read && "bg-accent-tint/40",
              )}
            >
              <div className="text-[13px] font-medium">{item.title || item.type}</div>
              {item.message && (
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">{item.message}</div>
              )}
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                {timeAgo(item.createdAt)}
              </div>
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
