"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Droplets, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginInput>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof LoginInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { error } = await authClient.signIn.email({
        email: result.data.email,
        password: result.data.password,
      });

      if (error) {
        setServerError(error.message ?? "Invalid email or password");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("We could not sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof LoginInput) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: event.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  return (
    <div className="grid min-h-screen bg-[#f4fafb] lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.82fr)]">
      <section className="relative hidden overflow-hidden bg-[#08232d] px-10 py-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(45,212,191,0.2),transparent_32%),radial-gradient(circle_at_75%_80%,rgba(14,116,144,0.35),transparent_35%)]" />
        <Link href="/" className="relative flex w-fit items-center gap-2 text-white" aria-label="AquaTrace home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Droplets className="h-6 w-6 text-teal-200" />
          </span>
          <span className="text-xl font-semibold tracking-tight">AquaTrace</span>
        </Link>
        <div className="relative my-auto max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-teal-100">
            <ShieldCheck className="h-4 w-4" /> Secure environmental intelligence
          </div>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight">Protect what flows through every community.</h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
            A focused workspace for documenting water incidents, reviewing evidence, and coordinating accountable action.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-3">
            {["Evidence-led", "Role-aware", "Human reviewed"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-medium text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-slate-400">AquaTrace · Water integrity operations</p>
      </section>

      <main className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <Link href="/" className="absolute left-5 top-5 flex items-center gap-2 font-semibold text-[#12333d] lg:hidden">
          <Droplets className="h-6 w-6 text-primary" /> AquaTrace
        </Link>
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(8,35,45,0.34)] sm:p-9">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Welcome back</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#102a33]">Sign in to AquaTrace</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Continue managing water-integrity reports and response activity.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" value={form.email} onChange={updateField("email")} placeholder="you@example.com" autoComplete="email" />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" type="password" value={form.password} onChange={updateField("password")} placeholder="Enter your password" autoComplete="current-password" />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            {serverError && <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" role="alert">{serverError}</p>}
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"} {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-6 border-t pt-6 text-center text-sm text-muted-foreground">
            Need to verify your email? <Link href="/verify-email" className="font-semibold text-primary hover:underline">Resend verification</Link>
          </div>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            New to AquaTrace? <Link href="/register" className="font-semibold text-primary hover:underline">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
