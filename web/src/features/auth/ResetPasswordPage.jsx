import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI, errorMessage } from "@/lib/api";
import AuthShell from "@/features/auth/AuthShell";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    // Both rules are enforced server-side too; checking here means the user sees
    // the problem against the field rather than as a generic error afterwards.
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("The two passwords do not match");

    setSubmitting(true);
    try {
      await authAPI.resetPassword(token, { password });
      setDone(true);
    } catch (error) {
      toast.error(
        errorMessage(error, "That link is invalid or has expired. Request a new one."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Password changed" subtitle="You can sign in with your new password">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-green-300 bg-green-50 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <Button className="mt-2" onClick={() => navigate("/login", { replace: true })}>
            Sign in
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose something you have not used here before"
      footer={
        <>
          Link expired?{" "}
          <Link to="/forgot-password" className="font-medium text-accent hover:underline">
            Request a new one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Type it again"
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Change password
        </Button>
      </form>
    </AuthShell>
  );
}
