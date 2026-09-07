"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Droplets, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const [form, setForm] = useState<ForgotPasswordInput>({ email: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const result = forgotPasswordSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const { error: requestError } = await authClient.requestPasswordReset({
        email: result.data.email,
        redirectTo: new URL("/reset-password", window.location.origin).toString(),
      });

      if (requestError) {
        setError("We could not process your request. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("We could not process your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4fafb] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(8,35,45,0.3)] sm:p-9">
        <Link href="/" className="flex w-fit items-center gap-2 font-semibold text-[#12333d]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Droplets className="h-5 w-5" /></span>
          AquaTrace
        </Link>

        {submitted ? (
          <div className="py-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-primary"><Mail className="h-7 w-7" /></span>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#102a33]">Check your inbox</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">If an AquaTrace account exists for that address, a password-reset link is on its way.</p>
            <Button className="mt-8 w-full" asChild><Link href="/login">Back to sign in <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        ) : (
          <>
            <div className="mt-10">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Account recovery</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102a33]">Reset your password</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Enter your email and we’ll send a secure reset link if an account exists.</p>
            </div>
            <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" value={form.email} onChange={(event) => setForm({ email: event.target.value })} placeholder="you@example.com" autoComplete="email" />
              </div>
              {error && <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" role="alert">{error}</p>}
              <Button type="submit" className="h-11 w-full" disabled={loading}>{loading ? "Sending link..." : "Send reset link"} {!loading && <ArrowRight className="h-4 w-4" />}</Button>
            </form>
            <Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
          </>
        )}
      </div>
    </main>
  );
}
