"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Droplets, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [status, setStatus] = useState<"idle" | "sent" | "error">(searchParams.get("email") ? "sent" : "idle");
  const [loading, setLoading] = useState(false);

  const handleResend = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus("idle");

    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: new URL("/dashboard", window.location.origin).toString(),
      });
      setStatus(error ? "error" : "sent");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4fafb] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(8,35,45,0.3)] sm:p-9">
        <Link href="/" className="flex w-fit items-center gap-2 font-semibold text-[#12333d]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Droplets className="h-5 w-5" /></span>AquaTrace</Link>
        <div className="mt-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-primary"><Mail className="h-7 w-7" /></span>
          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] text-primary">One more step</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102a33]">Verify your email</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Use the link in your inbox to activate secure access to AquaTrace.</p>
        </div>

        {status === "sent" && <p className="mt-6 flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-3 text-sm text-teal-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />If the address is eligible for verification, an email is on its way.</p>}
        {status === "error" && <p className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive" role="alert">We could not send a verification email. Please try again.</p>}

        <form onSubmit={handleResend} className="mt-6 space-y-4">
          <div className="space-y-2 text-left">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>
          <Button type="submit" variant="outline" className="h-11 w-full" disabled={loading || !email}>{loading ? "Sending..." : "Resend verification email"} {!loading && <RefreshCw className="h-4 w-4" />}</Button>
        </form>
        <Button className="mt-3 h-11 w-full" asChild><Link href="/login">Back to sign in <ArrowRight className="h-4 w-4" /></Link></Button>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailContent /></Suspense>;
}
