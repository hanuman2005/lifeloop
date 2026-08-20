import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { LogOut, Package, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/AuthContext";

const ROLE_LABEL = {
  donor: "Donor",
  recipient: "Recipient",
  both: "Donor and recipient",
  admin: "Administrator",
};

export default function ProfilePage() {
  const { user, userType, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-[22px] font-bold tracking-tight">Profile</h1>
      </header>

      <Card className="overflow-hidden">
        <CardContent className="space-y-5 pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-muted text-[22px] font-bold">
              {(user?.firstName?.[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[17px] font-semibold">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="truncate text-[13px] text-muted-foreground">{user?.email}</div>
            </div>
          </div>

          <Separator />

          <dl className="space-y-3 text-[13.5px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Role</dt>
              <dd>
                <Badge variant="secondary">{ROLE_LABEL[userType] || userType || "—"}</Badge>
              </dd>
            </div>
            {user?.phoneNumber && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="tabular-nums">{user.phoneNumber}</dd>
              </div>
            )}
            {user?.address && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Address</dt>
                <dd className="truncate max-w-[200px]">{user.address}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" asChild className="justify-start h-11">
          <Link to="/listings/mine"><Package className="mr-2 h-4 w-4" />My items</Link>
        </Button>
        <Button variant="outline" asChild className="justify-start h-11">
          <Link to="/bins/report"><Trash2 className="mr-2 h-4 w-4" />Report a bin</Link>
        </Button>
      </div>

      <Button variant="outline" className="w-full text-destructive h-11" onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
