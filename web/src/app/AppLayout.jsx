// Shell for every authenticated screen: sidebar on desktop, bottom bar on mobile.
//
// The app is used one-handed outdoors while standing over a bin, so the mobile
// layout is the primary one and the desktop sidebar is the adaptation.

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, CalendarClock, Camera, LayoutDashboard, LogOut, MapPin, MessageSquare, Package, QrCode, Recycle, Shield, Trash2, Truck, User } from "lucide-react";

import { useAuth } from "@/features/auth/AuthContext";
import NotificationBell from "@/features/notifications/NotificationBell";
import { cn } from "@/lib/utils";

// `roles` omitted means everyone. The mobile bar is capped at five items because
// more than that stops being tappable one-handed.
const NAV = [
  { to: "/scan", label: "Scan", icon: Camera },
  { to: "/listings", label: "Exchange", icon: Package },
  { to: "/bins/report", label: "Report bin", icon: Trash2 },
  { to: "/bins/map", label: "Waste map", icon: MapPin },
  { to: "/centres", label: "Where to take it", icon: Recycle },
  { to: "/chat", label: "Messages", icon: MessageSquare },
  { to: "/schedules", label: "Pickups", icon: CalendarClock },
  { to: "/handover", label: "Handover", icon: QrCode },
  { to: "/collect", label: "Collect", icon: Truck, roles: ["collector", "admin"] },
  { to: "/municipal", label: "Municipal", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/admin", label: "Admin", icon: Shield, roles: ["admin"] },
  { to: "/impact", label: "Impact", icon: BarChart3 },
];

function NavItem({ to, label, icon: Icon, mobile }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-md text-[13.5px] font-medium transition-colors",
          mobile
            ? "flex-col gap-1 px-2 py-2 text-[11px] flex-1"
            : "px-3 py-2",
          isActive
            ? "bg-accent-tint text-accent"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )
      }
    >
      <Icon className={mobile ? "h-[18px] w-[18px]" : "h-4 w-4"} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, userType, logout } = useAuth();
  const navigate = useNavigate();

  const nav = NAV.filter((item) => !item.roles || item.roles.includes(userType));

  // The bottom bar holds five items at most before targets get too small to hit
  // one-handed, so it carries the most-used screens rather than the first five
  // declared. Everything else stays reachable from the sidebar and from links.
  const MOBILE_PRIORITY = ["/scan", "/listings", "/bins/report", "/chat", "/impact"];
  const mobileNav = MOBILE_PRIORITY.map((to) => nav.find((item) => item.to === to)).filter(Boolean);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-border bg-sidebar">
        <div className="px-5 py-5 border-b border-border">
          <div className="text-[15px] font-semibold tracking-tight">LifeLoop</div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
            Circular economy
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-1">
          <NavItem to="/profile" label={user?.firstName || "Profile"} icon={User} />
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Content. Bottom padding clears the mobile bar. */}
      <main className="md:pl-60 pb-20 md:pb-0">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:justify-end md:px-8">
          <span className="text-[14px] font-semibold tracking-tight md:hidden">LifeLoop</span>
          <NotificationBell />
        </div>
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-border bg-card px-1 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {mobileNav.map((item) => (
          <NavItem key={item.to} {...item} mobile />
        ))}
      </nav>
    </div>
  );
}
