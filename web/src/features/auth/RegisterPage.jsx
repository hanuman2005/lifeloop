import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import AuthShell from "@/features/auth/AuthShell";
import { cn } from "@/lib/utils";

// Mirrors the userType enum in backend/models/User.js. "admin" is deliberately
// absent — it is granted server-side, never chosen at signup.
const ROLES = [
  { value: "donor", label: "I have items to give", hint: "Post items others can collect" },
  { value: "recipient", label: "I am looking for items", hint: "Browse and claim nearby items" },
  { value: "both", label: "Both", hint: "Give and receive" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    userType: "both",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();

    // The backend enforces this too; checking here avoids a round trip and gives
    // a message tied to the field rather than a generic server error.
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      await register(form);
      navigate("/scan", { replace: true });
    } catch (error) {
      toast.error(errorMessage(error, "Could not create your account"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start giving items a second life"
      wide
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-accent font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" required value={form.firstName} onChange={update("firstName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" required value={form.lastName} onChange={update("lastName")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={update("email")}
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phoneNumber">Phone number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            inputMode="numeric"
            required
            value={form.phoneNumber}
            onChange={update("phoneNumber")}
            placeholder="9876543210"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={form.password}
            onChange={update("password")}
            placeholder="At least 6 characters"
          />
        </div>

        <div className="space-y-2">
          <Label>How will you use LifeLoop?</Label>
          <RadioGroup
            value={form.userType}
            onValueChange={(value) => setForm((prev) => ({ ...prev, userType: value }))}
            className="gap-2"
          >
            {ROLES.map((role) => (
              <label
                key={role.value}
                htmlFor={`role-${role.value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                  form.userType === role.value
                    ? "border-accent bg-accent-tint"
                    : "border-border hover:bg-secondary",
                )}
              >
                <RadioGroupItem value={role.value} id={`role-${role.value}`} className="mt-0.5" />
                <span className="space-y-0.5">
                  <span className="block text-[13.5px] font-medium text-foreground">{role.label}</span>
                  <span className="block text-[12.5px] text-muted-foreground">{role.hint}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <Button type="submit" variant="accent" className="h-11 w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
