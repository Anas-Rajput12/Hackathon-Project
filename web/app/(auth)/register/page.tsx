"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Droplets, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterInput>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof RegisterInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof RegisterInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { error } = await authClient.signUp.email({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
        callbackURL: new URL("/dashboard", window.location.origin).toString(),
      });

      if (error) {
        setServerError(error.message ?? "We could not create your account");
        return;
      }

      router.replace(`/verify-email?email=${encodeURIComponent(result.data.email)}`);
    } catch {
      setServerError("We could not create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof RegisterInput) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: event.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  return (
    <div className="min-h-screen bg-[#f4fafb] px-4 py-6 sm:px-8 sm:py-10">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-[#12333d]" aria-label="AquaTrace home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Droplets className="h-5 w-5" /></span>
          <span className="text-lg">AquaTrace</span>
        </Link>
        <Link href="/login" className="text-sm font-semibold text-primary hover:underline">Sign in</Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:py-16">
        <section className="hidden max-w-xl lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Community reporting</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.05] tracking-tight text-[#102a33]">Start with a clearer picture of water integrity.</h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">Document incidents with evidence, follow response activity, and help protect shared water resources.</p>
          <div className="mt-10 rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <p className="mt-4 font-semibold text-[#173b45]">Public accounts are community reporter accounts.</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Authority and administrator access is provisioned through controlled organizational workflows.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(8,35,45,0.3)] sm:p-9">
          <div className="mb-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Create account</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#102a33]">Join AquaTrace</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">We’ll send a verification link before you can sign in.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={form.name} onChange={updateField("name")} placeholder="Jane Doe" autoComplete="name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" value={form.email} onChange={updateField("email")} placeholder="you@example.com" autoComplete="email" />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={updateField("password")} placeholder="At least 8 characters" autoComplete="new-password" />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            {serverError && <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" role="alert">{serverError}</p>}
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"} {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">Already registered? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
        </section>
      </main>
    </div>
  );
}
