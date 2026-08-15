// Moderation console.
//
// Every action here is reversible and every destructive one asks first. A
// moderator working through a queue makes mistakes, and an interface that makes
// them cheap to undo produces better moderation than one that makes them
// impossible to make.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, Flag, RotateCcw, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { adminAPI, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

function Stat({ label, value, tone }) {
  return (
    <Card>
      <CardContent className="py-3.5">
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={cn("mt-0.5 text-[20px] font-semibold tabular-nums", tone)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Overview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await adminAPI.dashboardStats()).data,
  });

  if (isLoading) return <LoadingState label="Loading platform stats" />;

  const stats = data?.stats || {};

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Users
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Total" value={stats.users?.total ?? 0} />
          <Stat label="Active" value={stats.users?.active ?? 0} />
          <Stat label="Suspended" value={stats.users?.suspended ?? 0} tone="text-destructive" />
          <Stat label="New this week" value={stats.users?.newThisWeek ?? 0} />
        </div>
      </div>

      <div>
        <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Listings
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Total" value={stats.listings?.total ?? 0} />
          <Stat label="Active" value={stats.listings?.active ?? 0} />
          <Stat label="Completed" value={stats.listings?.completed ?? 0} />
          <Stat label="Flagged" value={stats.listings?.flagged ?? 0} tone="text-destructive" />
        </div>
      </div>

      <div>
        <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Needs attention
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Reports pending"
            value={stats.reports?.pending ?? 0}
            tone={stats.reports?.pending ? "text-destructive" : undefined}
          />
          <Stat label="Verifications pending" value={stats.verifications?.pending ?? 0} />
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await adminAPI.users({ limit: 50 })).data,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const suspend = useMutation({
    mutationFn: ({ id, reason }) => adminAPI.suspendUser(id, { reason }),
    onSuccess: () => { toast.success("Account suspended"); refresh(); },
    onError: (error) => toast.error(errorMessage(error, "Could not suspend the account")),
  });

  const unsuspend = useMutation({
    mutationFn: (id) => adminAPI.unsuspendUser(id),
    onSuccess: () => { toast.success("Account restored"); refresh(); },
    onError: (error) => toast.error(errorMessage(error, "Could not restore the account")),
  });

  if (isLoading) return <LoadingState label="Loading users" />;

  const users = data?.users || [];
  const term = search.trim().toLowerCase();
  const visible = term
    ? users.filter((user) =>
        [user.firstName, user.lastName, user.email].join(" ").toLowerCase().includes(term),
      )
    : users;

  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name or email"
      />

      {visible.length === 0 && <EmptyState title="No users match" />}

      {visible.map((user) => {
        const suspended = user.isSuspended || user.isActive === false;
        return (
          <Card key={user._id}>
            <CardContent className="flex items-center gap-3 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[13px] font-medium">
                {(user.firstName?.[0] || "?").toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[14px] font-medium">
                    {[user.firstName, user.lastName].filter(Boolean).join(" ")}
                  </span>
                  <Badge variant="secondary">{user.userType}</Badge>
                  {suspended && (
                    <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
                      Suspended
                    </Badge>
                  )}
                </div>
                <div className="truncate text-[12.5px] text-muted-foreground">{user.email}</div>
              </div>

              {suspended ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unsuspend.mutate(user._id)}
                  disabled={unsuspend.isPending}
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Restore
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    // A suspension without a stated reason is one nobody can review
                    // later, including the moderator who made it.
                    const reason = window.prompt("Reason for suspending this account?");
                    if (reason?.trim()) suspend.mutate({ id: user._id, reason: reason.trim() });
                  }}
                  disabled={suspend.isPending}
                >
                  <Ban className="mr-2 h-3.5 w-3.5" />
                  Suspend
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ReportsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => (await adminAPI.reports({ limit: 50 })).data,
  });

  if (isLoading) return <LoadingState label="Loading reports" />;

  const reports = data?.reports || [];

  if (reports.length === 0) {
    return <EmptyState title="No reports" description="Nothing has been reported." icon={<Flag className="h-5 w-5" />} />;
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <Card key={report._id}>
          <CardContent className="space-y-1.5 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[14px] font-medium">{report.reason || "Report"}</span>
              <Badge variant="outline" className={cn(report.status === "pending" && "border-amber-300 bg-amber-50 text-amber-800")}>
                {report.status || "pending"}
              </Badge>
            </div>
            {report.description && (
              <p className="text-[13px] text-muted-foreground">{report.description}</p>
            )}
            <div className="font-mono text-[11px] text-muted-foreground">
              {new Date(report.createdAt).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FlaggedTab() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-flagged"],
    queryFn: async () => (await adminAPI.flaggedContent({ limit: 50 })).data,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-flagged"] });

  const remove = useMutation({
    mutationFn: ({ id, reason }) => adminAPI.removeFlagged(id, { reason }),
    onSuccess: () => { toast.success("Content removed"); refresh(); },
    onError: (error) => toast.error(errorMessage(error, "Could not remove that content")),
  });

  const restore = useMutation({
    mutationFn: (id) => adminAPI.restoreFlagged(id),
    onSuccess: () => { toast.success("Content restored"); refresh(); },
    onError: (error) => toast.error(errorMessage(error, "Could not restore that content")),
  });

  if (isLoading) return <LoadingState label="Loading flagged content" />;

  // The endpoint groups by type, so accept either a flat list or a keyed object.
  const items = data?.flaggedListings || data?.content || data?.data || [];

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing flagged"
        description="Listings reported by users appear here for review."
        icon={<ShieldCheck className="h-5 w-5" />}
      />
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item._id}>
          <CardContent className="space-y-2 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium">{item.title || "Listing"}</div>
                {item.description && (
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
              {item.reportCount ? (
                <Badge variant="outline" className="shrink-0 border-red-300 bg-red-50 text-red-800">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {item.reportCount}
                </Badge>
              ) : null}
            </div>

            <div className="flex gap-2 border-t border-border pt-2.5">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-destructive"
                onClick={() => {
                  const reason = window.prompt("Why is this being removed?");
                  if (reason?.trim()) remove.mutate({ id: item._id, reason: reason.trim() });
                }}
                disabled={remove.isPending}
              >
                Remove
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => restore.mutate(item._id)}
                disabled={restore.isPending}
              >
                Keep
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Administration</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Platform health, accounts, and content that users have reported.
        </p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="users" className="flex-1">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1">Reports</TabsTrigger>
          <TabsTrigger value="flagged" className="flex-1">Flagged</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4"><Overview /></TabsContent>
        <TabsContent value="users" className="pt-4"><UsersTab /></TabsContent>
        <TabsContent value="reports" className="pt-4"><ReportsTab /></TabsContent>
        <TabsContent value="flagged" className="pt-4"><FlaggedTab /></TabsContent>
      </Tabs>
    </div>
  );
}
