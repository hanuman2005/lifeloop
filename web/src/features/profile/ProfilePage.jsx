// The account screen.
//
// It used to be a name, a role, a phone number and three buttons, which left most
// of the screen empty and told a person nothing they did not already know. What
// belongs here is the record: how long they have been contributing, what they have
// contributed, and how much their bin reports are trusted.
//
// Standing is shown here and on the impact screen but never on the reporting
// screen. Showing your weight while you report invites gaming it; showing it
// against your own record frames it as something earned.

import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  LogOut,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/shared/components/PageHeader";
import { useAuth } from "@/features/auth/AuthContext";
import { binsAPI, ecoAPI } from "@/lib/api";

const ROLE_LABEL = {
  donor: "Donor",
  recipient: "Recipient",
  both: "Donor and recipient",
  collector: "Waste collector",
  admin: "Administrator",
};

/**
 * User.address is an object, and every field except country is optional. Returns
 * an empty string when nothing but the default country is set, so the row is
 * hidden rather than showing a lone "India".
 */
function formatAddress(address) {
  if (!address || typeof address !== "object") return address || "";

  return [address.street, address.city, address.state, address.zipCode]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function Figure({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-[19px] font-semibold leading-none tabular-nums">{value}</div>
      <div className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const { user, userType, logout } = useAuth();
  const navigate = useNavigate();

  const eco = useQuery({
    queryKey: ["eco-points"],
    queryFn: async () => (await ecoAPI.getMyPoints()).data,
  });

  const bins = useQuery({
    queryKey: ["my-bin-reports"],
    queryFn: async () => (await binsAPI.getMyReports()).data,
  });

  // The controller wraps its payload as { success, data }.
  const record = eco.data?.data || eco.data || {};
  const stats = record.stats || {};
  const standing = bins.data?.standing;

  // From the BinReport collection rather than the eco-points counter. The counter
  // increments per award and drifts, which is how this card came to read "3 bin
  // reports" while the standing card below it said twenty were accepted.
  const binCount = standing?.total ?? stats.totalBinReports ?? 0;

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Profile" description="Your account and your record." />

      <Card className="overflow-hidden">
        <CardContent className="space-y-5 pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent text-[22px] font-bold text-accent-foreground">
              {(user?.firstName?.[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-semibold">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="truncate text-[13px] text-muted-foreground">{user?.email}</div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {ROLE_LABEL[userType] || userType || "—"}
            </Badge>
          </div>

          {/* Level and points sit inside the identity card rather than in their own
              box: they describe this person, not a separate subject. */}
          {record.level && (
            <div className="flex items-center justify-between gap-3 rounded-[calc(var(--radius)-2px)] bg-accent-tint/60 px-4 py-3">
              <span className="text-[13.5px] font-medium">{record.level}</span>
              <span className="font-mono text-[13px] tabular-nums text-accent">
                {record.totalPoints ?? 0} pts
              </span>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-3 gap-2">
            <Figure value={stats.totalScans ?? 0} label="Scans" />
            <Figure value={binCount} label="Bin reports" />
            <Figure value={stats.totalDonations ?? 0} label="Given away" />
          </div>

          <Separator />

          <dl className="space-y-3 text-[13.5px]">
            {user?.phoneNumber && (
              <DetailRow icon={Phone} label="Phone">
                <span className="tabular-nums">{user.phoneNumber}</span>
              </DetailRow>
            )}
            {/* address is an object on the User schema. Rendering it directly threw
                "Objects are not valid as a React child" and took the page down. */}
            {formatAddress(user?.address) && (
              <DetailRow icon={MapPin} label="Address">
                {formatAddress(user.address)}
              </DetailRow>
            )}
            {memberSince && (
              <DetailRow icon={CalendarDays} label="Member since">
                {memberSince}
              </DetailRow>
            )}
          </dl>
        </CardContent>
      </Card>

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
              {standing.accepted} of {standing.total} reports accepted. Your reports carry{" "}
              <span className="font-mono tabular-nums text-foreground">{standing.weight}×</span>{" "}
              weight on the ward map.
            </p>

            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent"
                // Weight runs 0.2–3; show it as a share of the maximum.
                style={{ width: `${Math.min(100, (standing.weight / 3) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" asChild className="h-11 justify-start">
          <Link to="/listings/mine">
            <Package className="mr-2 h-4 w-4" />
            My items
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-11 justify-start">
          <Link to="/bins/report">
            <Trash2 className="mr-2 h-4 w-4" />
            Report a bin
          </Link>
        </Button>
      </div>

      <Button
        variant="outline"
        className="h-11 w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
