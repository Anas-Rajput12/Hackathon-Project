"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Droplets, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [form, setForm] = useState<ResetPasswordInput>({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordInput, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof ResetPasswordInput) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: event.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);

    const result = resetPasswordSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ResetPasswordInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ResetPasswordInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (!token) {
      setServerError("This reset link is invalid or incomplete. Request a new link to continue.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.resetPassword({ token, newPassword: result.data.password });
      if (error) {
        setServerError("This reset link is invalid or expired. Request a new link to continue.");
        return;
      }
      setComplete(true);
    } catch {
      setServerError("We could not reset your password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthCard>
        <div className="py-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><KeyRound className="h-7 w-7" /></span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#102a33]">Reset link unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Request a fresh password-reset link to continue securely.</p>
          <Button className="mt-8 w-full" asChild><Link href="/forgot-password">Request a new link <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </AuthCard>
    );
  }

  if (complete) {
    return (
      <AuthCard>
        <div className="py-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-primary"><KeyRound className="h-7 w-7" /></span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#102a33]">Password updated</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Your active sessions have been signed out. Use your new password to sign in again.</p>
          <Button className="mt-8 w-full" asChild><Link href="/login">Sign in securely <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="mt-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Secure reset</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102a33]">Choose a new password</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Use a password with at least eight characters. Your other sessions will be signed out.</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" value={form.password} onChange={updateField("password")} autoComplete="new-password" />
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField("confirmPassword")} autoComplete="new-password" />
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
        </div>
        {serverError && <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" role="alert">{serverError}</p>}
        <Button type="submit" className="h-11 w-full" disabled={loading}>{loading ? "Updating password..." : "Update password"} {!loading && <ArrowRight className="h-4 w-4" />}</Button>
      </form>
      <Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
    </AuthCard>
  );
}

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4fafb] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(8,35,45,0.3)] sm:p-9">
        <Link href="/" className="flex w-fit items-center gap-2 font-semibold text-[#12333d]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Droplets className="h-5 w-5" /></span>AquaTrace</Link>
        {children}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
