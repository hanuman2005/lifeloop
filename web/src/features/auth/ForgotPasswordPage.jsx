import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI, errorMessage } from "@/lib/api";
import AuthShell from "@/features/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await authAPI.forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (error) {
      // Deliberately still shown as sent on a 404: telling an anonymous visitor
      // whether an address is registered is an account-enumeration hole. Only a
      // genuine server or network failure surfaces as an error.
      if (error?.response?.status === 404) {
        setSent(true);
      } else {
        toast.error(errorMessage(error, "Could not send the reset link"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="If that address has an account, a reset link is on its way">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
            <MailCheck className="h-5 w-5" />
          </div>
          <p className="text-[13.5px] text-muted-foreground">
            The link expires shortly. If nothing arrives, check your spam folder and
            confirm the address is the one you signed up with.
          </p>
          <Button variant="outline" asChild className="mt-2">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We will email you a link to set a new one"
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <Button type="submit" variant="accent" className="h-11 w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
