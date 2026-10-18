import { createFileRoute } from "@tanstack/react-router";
import { Globe, Share2, Search, Palette, BarChart3, ClipboardList, ScanSearch, Send, Lock } from "lucide-react";
import { AuditForm } from "@/components/site/AuditForm";
import { AuditButton } from "@/components/site/Chrome";
import { ServiceGroups } from "@/components/site/ServiceGrid";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Free Business Audit | premiumxlabs" },
      { name: "description", content: "Find out what's holding your business back. Get a free written audit of your website, social, Google presence, branding and ads within 48 hours." },
      { property: "og:title", content: "Free Business Audit | premiumxlabs" },
      { property: "og:description", content: "Get a clear, free report on what's not working in your marketing — within 48 hours." },
    ],
  }),
  component: Home,
});

const AUDITS = [
  { icon: Globe, label: "Website" },
  { icon: Share2, label: "Social Media" },
  { icon: Search, label: "Google Presence" },
  { icon: Palette, label: "Branding" },
  { icon: BarChart3, label: "Ads & Marketing Activity" },
];
const STEPS = [
  { icon: ClipboardList, title: "Tell us about your business", desc: "Fill the short form. No login, no payment." },
  { icon: ScanSearch, title: "We audit it", desc: "Our team reviews your online presence and marketing." },
  { icon: Send, title: "Get your report in 48 hours", desc: "Delivered by WhatsApp or email, written in plain language." },
];

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`px-4 py-20 md:py-28 ${className}`}><div className="mx-auto max-w-6xl">{children}</div></section>;
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-bold uppercase tracking-widest text-cta">{children}</p>;
}

function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-soft px-4 pb-20 pt-12 md:pt-20">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-cta/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="lg:sticky lg:top-28">
            <Eyebrow>Free business audit</Eyebrow>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] text-navy sm:text-5xl lg:text-6xl">
              Find Out What's Holding Your Business Back.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Whether you're just starting or already spending on ads, we'll show you what's not working. Tell us about
              your business and get a clear report within 48 hours.
            </p>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-steel">
              <li>✓ 100% free</li><li>✓ No login required</li><li>✓ Report in 48 hours</li>
            </ul>
          </div>
          <AuditForm />
        </div>
      </section>

      <Section>
        <div className="text-center">
          <Eyebrow>What we audit</Eyebrow>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Five areas. One honest report.</h2>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {AUDITS.map((a) => (
            <div key={a.label} className="rounded-2xl border border-border p-6 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-cta"><a.icon className="h-7 w-7" /></span>
              <p className="mt-4 font-display font-bold">{a.label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-soft">
        <div className="text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Three simple steps</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-3xl bg-card p-8">
              <span className="font-display text-6xl font-extrabold text-accent">0{i + 1}</span>
              <s.icon className="mt-2 h-7 w-7 text-cta" />
              <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>Sample audit</Eyebrow>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Clear findings. Practical next steps.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No vague scores or ratings. Every section explains what we found, why it matters, and exactly what to do about it.
            </p>
            <AuditButton className="mt-8" label="Get My Free Audit" />
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-navy/10 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audit report</p>
                <p className="font-display text-lg font-bold">Mama Nkechi's Kitchen, Abuja</p>
              </div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-steel">Sample audit, example only</span>
            </div>
            <div className="mt-6 rounded-2xl bg-soft p-5">
              <h4 className="flex items-center gap-2 font-bold"><Search className="h-4 w-4 text-cta" /> Google Presence</h4>
              <dl className="mt-4 space-y-4 text-sm">
                <div><dt className="font-semibold text-navy">What we found</dt><dd className="mt-1 text-muted-foreground">The business has no Google Business Profile. Searching "restaurant near Wuse 2" shows five competitors, but not this kitchen.</dd></div>
                <div><dt className="font-semibold text-navy">Why it matters</dt><dd className="mt-1 text-muted-foreground">Most people find local food on Google Maps. Without a profile, hungry customers nearby can't find your address, hours or menu.</dd></div>
                <div><dt className="font-semibold text-navy">Recommendation</dt><dd className="mt-1 text-muted-foreground">Create and verify a Google Business Profile, add 10+ real food photos and opening hours, and ask your regular customers for reviews.</dd></div>
              </dl>
            </div>
            <div className="mt-4 space-y-3">
              {["Website", "Social Media", "Branding", "Ads & Marketing Activity"].map((t) => (
                <div key={t} className="relative overflow-hidden rounded-xl border border-border p-4">
                  <div className="select-none blur-[3px]">
                    <p className="font-bold">{t}</p>
                    <p className="text-sm text-muted-foreground">What we found, why it matters and our recommendation…</p>
                  </div>
                  <Lock className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="bg-soft">
        <div className="mb-12 max-w-2xl">
          <Eyebrow>Services</Eyebrow>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Everything you need to grow</h2>
        </div>
        <ServiceGroups />
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>About us</Eyebrow>
          <p className="mt-6 font-display text-2xl font-semibold leading-relaxed text-navy sm:text-3xl">
            We're a marketing and digital solutions company. We help businesses of every size, from startups to established
            companies, grow with smart marketing and the right digital tools. From launching a new business to running a full
            marketing campaign, we plan it, build it and deliver it.
          </p>
        </div>
      </Section>

      <section className="px-4 pb-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-navy px-6 py-16 text-center text-navy-foreground sm:px-12">
          <h2 className="text-3xl font-extrabold sm:text-5xl">Ready to see what's holding you back?</h2>
          <p className="mx-auto mt-4 max-w-xl text-navy-foreground/70">Get a free, written audit of your business in 48 hours. No login. No obligation.</p>
          <AuditButton className="mt-8 px-8 py-4 text-base" />
        </div>
      </section>
    </>
  );
}
