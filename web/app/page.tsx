import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Droplets, FileText, MapPin, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    icon: FileText,
    label: "Evidence first",
    title: "Turn field reports into usable case files.",
    description: "Capture locations, photos, documents, and context in a structured incident record.",
  },
  {
    icon: ShieldCheck,
    label: "Accountable review",
    title: "Keep every response visible.",
    description: "Move from submitted report to verification, assignment, and resolution with an auditable trail.",
  },
  {
    icon: BarChart3,
    label: "Human-guided insight",
    title: "Prioritize without losing judgment.",
    description: "Five analysis stages organize available signals for review. Decisions remain with people.",
  },
  {
    icon: MapPin,
    label: "Geographic context",
    title: "See patterns around water bodies.",
    description: "Connect incidents to locations and affected resources for a clearer operational picture.",
  },
  {
    icon: Users,
    label: "Role-aware workflows",
    title: "Give each team the right view.",
    description: "Community reporters, inspectors, NGOs, and authorities work from purposeful, protected spaces.",
  },
  {
    icon: CheckCircle2,
    label: "Traceable resolution",
    title: "Follow action through closure.",
    description: "Record alerts, assignments, updates, and outcomes instead of letting reports disappear.",
  },
];

const workflow = [
  ["01", "Document", "Capture the incident and its location."],
  ["02", "Corroborate", "Attach evidence and verify what is known."],
  ["03", "Assess", "Review water-quality context and risk signals."],
  ["04", "Coordinate", "Route accountable action to the right team."],
  ["05", "Resolve", "Track progress and record the final outcome."],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f6fbfc] text-[#102a33]">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#f6fbfc]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="AquaTrace home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b6972] text-white shadow-lg shadow-teal-900/15"><Droplets className="h-5 w-5" /></span>
            <span className="text-lg font-semibold tracking-tight">AquaTrace</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <Link href="#platform" className="transition-colors hover:text-primary">Platform</Link>
            <Link href="#workflow" className="transition-colors hover:text-primary">Workflow</Link>
            <Link href="#principles" className="transition-colors hover:text-primary">Principles</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild><Link href="/login">Sign in</Link></Button>
            <Button size="sm" asChild><Link href="/register">Get started <ArrowRight className="hidden h-4 w-4 sm:block" /></Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-[#08232d] px-4 pb-24 pt-16 text-white sm:px-6 sm:pt-22 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(45,212,191,0.18),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(14,116,144,0.34),transparent_28%),linear-gradient(120deg,#08232d_0%,#0b2d37_54%,#08232d_100%)]" />
          <div className="absolute -right-28 top-24 -z-10 h-96 w-96 rounded-full border border-white/10" />
          <div className="absolute -right-12 top-40 -z-10 h-64 w-64 rounded-full border border-white/10" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.85fr)] lg:gap-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-teal-100">
                <span className="h-2 w-2 rounded-full bg-teal-300 shadow-[0_0_0_4px_rgba(94,234,212,0.12)]" /> Evidence-led water integrity operations
              </div>
              <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-7xl">
                See water risks sooner. <span className="text-teal-200">Move with clarity.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
                AquaTrace brings reporting, evidence, risk context, and accountable response into one calm, secure operational workspace.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="bg-teal-300 text-[#083039] hover:bg-teal-200" asChild><Link href="/register">Start a report <ArrowRight className="h-4 w-4" /></Link></Button>
                <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" asChild><Link href="/dashboard">Explore the workspace</Link></Button>
              </div>
              <p className="mt-6 text-sm text-slate-400">AI organizes available information for human review; it does not replace field verification or regulatory judgment.</p>
            </div>

            <div className="relative mx-auto w-full max-w-xl rounded-3xl border border-white/12 bg-slate-950/25 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-sm sm:p-5">
              <div className="rounded-2xl border border-white/10 bg-[#0b2b35] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">Illustrative case signal</p><h2 className="mt-1 text-lg font-semibold">Serpentine Bend</h2></div>
                  <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-200">Under review</span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[{ label: "Evidence", value: "04 items" }, { label: "Priority", value: "High" }, { label: "Location", value: "Mapped" }, { label: "Owner", value: "Assigned" }].map((item) => (
                    <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3.5"><p className="text-xs text-slate-400">{item.label}</p><p className="mt-1 text-sm font-semibold text-white">{item.value}</p></div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-teal-300/15 bg-teal-300/5 p-4">
                  <div className="flex items-center justify-between text-sm"><span className="font-medium text-teal-100">Review progression</span><span className="text-teal-200">4 of 5 stages</span></div>
                  <div className="mt-3 flex gap-1.5">{[1, 2, 3, 4, 5].map((stage) => <span key={stage} className={`h-1.5 flex-1 rounded-full ${stage < 5 ? "bg-teal-300" : "bg-white/15"}`} />)}</div>
                </div>
                <div className="mt-5 flex items-center gap-3 text-sm text-slate-300"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"><ShieldCheck className="h-4 w-4 text-teal-200" /></span> Evidence and context remain reviewable at every step.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-35px_rgba(8,35,45,0.4)] sm:grid-cols-2 lg:grid-cols-4">
            {[ ["25", "Sample incidents", "Seeded demo data"], ["8", "Water bodies", "Illustrative coverage"], ["5", "Review stages", "Decision-support workflow"], ["4", "User perspectives", "Role-aware workspace"] ].map(([value, label, detail]) => (
              <div key={label} className="border-b border-slate-100 p-6 last:border-b-0 sm:even:border-l sm:even:border-l-slate-100 lg:border-b-0 lg:border-l lg:first:border-l-0"><p className="text-3xl font-semibold tracking-tight text-primary">{value}</p><p className="mt-2 text-sm font-semibold text-[#173b45]">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
            ))}
          </div>
        </section>

        <section id="platform" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">One focused platform</p><h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#102a33] sm:text-4xl">An operational system built for clarity, not noise.</h2><p className="mt-5 text-lg leading-relaxed text-muted-foreground">Every tool is designed to preserve context as a report moves from community observation to accountable action.</p></div>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return <article key={capability.title} className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_30px_-26px_rgba(8,35,45,0.32)] transition duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_22px_45px_-26px_rgba(8,35,45,0.34)]"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-primary"><Icon className="h-5 w-5" /></span><p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{capability.label}</p><h3 className="mt-2 text-xl font-semibold tracking-tight text-[#173b45]">{capability.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{capability.description}</p></article>;
            })}
          </div>
        </section>

        <section id="workflow" className="border-y border-slate-200/80 bg-white px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">A consistent response path</p><h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#102a33] sm:text-4xl">From a first observation to an accountable outcome.</h2><p className="mt-5 leading-relaxed text-muted-foreground">AquaTrace keeps the record connected while different people contribute the evidence, expertise, and action needed to respond.</p></div><div className="divide-y divide-slate-200 border-y border-slate-200">{workflow.map(([number, title, description]) => <div key={number} className="grid grid-cols-[3.5rem_1fr] gap-4 py-5 sm:grid-cols-[5rem_1fr]"><span className="font-mono text-sm font-semibold text-primary">{number}</span><div><h3 className="font-semibold text-[#173b45]">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div>)}</div></div>
          </div>
        </section>

        <section id="principles" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32"><div className="grid gap-10 rounded-3xl bg-[#e7f5f4] p-7 sm:p-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:p-14"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Built responsibly</p><h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#102a33] sm:text-4xl">Technology supports accountable people.</h2><p className="mt-5 max-w-xl leading-relaxed text-[#49636d]">AquaTrace helps organize evidence and surface patterns. Its AI analysis is clearly marked as decision support, with human verification remaining central to every conclusion.</p><Button className="mt-8" asChild><Link href="/register">Create a community account <ArrowRight className="h-4 w-4" /></Link></Button></div><div className="rounded-2xl border border-teal-100 bg-white/80 p-6"><ShieldCheck className="h-8 w-8 text-primary" /><h3 className="mt-6 text-xl font-semibold text-[#173b45]">Human verification remains the standard.</h3><ul className="mt-5 space-y-4 text-sm leading-relaxed text-[#49636d]">{["Evidence is preserved in reviewable incident records.", "Permissions keep each workspace role-appropriate.", "AI outputs are contextual guidance, never final determinations."].map((item) => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul></div></div></section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center"><div className="flex items-center gap-2 font-semibold text-[#173b45]"><Droplets className="h-5 w-5 text-primary" /> AquaTrace</div><p>Evidence-led water integrity operations.</p></div></footer>
    </div>
  );
}
