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
        <h1 className="text-[22px] font-semibold tracking-tight">Profile</h1>
      </header>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted text-[17px] font-medium">
              {(user?.firstName?.[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[16px] font-medium">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="truncate text-[13px] text-muted-foreground">{user?.email}</div>
            </div>
          </div>

          <Separator />

          <dl className="space-y-2.5 text-[13.5px]">
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
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" asChild className="justify-start">
          <Link to="/listings/mine"><Package className="mr-2 h-4 w-4" />My items</Link>
        </Button>
        <Button variant="outline" asChild className="justify-start">
          <Link to="/bins/report"><Trash2 className="mr-2 h-4 w-4" />Report a bin</Link>
        </Button>
      </div>

      <Button variant="outline" className="w-full text-destructive" onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
