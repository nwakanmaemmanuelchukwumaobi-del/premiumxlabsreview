import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
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

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`px-4 py-20 md:py-28 ${className}`}><div className="mx-auto max-w-6xl">{children}</div></section>;
}
function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-sm font-bold uppercase tracking-widest ${light ? "text-steel-bright" : "text-cta"}`}>{children}</p>;
}

function Home() {
  return (
    <>
      {/* HERO */}
      <section className="hero-texture relative overflow-hidden bg-navy px-4 pb-28 pt-14 md:pb-36 md:pt-20" style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 4vw), 0 100%)" }}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-navy via-navy to-[oklch(0.22_0.09_262)]" />
        <div className="pointer-events-none absolute -right-24 top-1/2 hidden -translate-y-1/2 select-none font-display text-[38rem] font-extrabold italic leading-none text-navy-foreground/[0.05] lg:block" aria-hidden>
          X
        </div>
        <div className="relative mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[1.05fr_1fr]">
          <Reveal className="lg:sticky lg:top-28">
            <Eyebrow light>Free business audit</Eyebrow>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.02] tracking-tight text-navy-foreground sm:text-5xl lg:text-7xl">
              Find Out What's <span className="italic text-steel-bright">Holding Your Business Back.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-navy-foreground/70">
              Whether you're just starting or already spending on ads, we'll show you what's not working. Tell us about
              your business and get a clear report within 48 hours.
            </p>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-navy-foreground/80">
              <li>✓ 100% free</li><li>✓ No login required</li><li>✓ Report in 48 hours</li>
            </ul>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {AUDITS.map((a) => (
                <div key={a.label} className="flex items-center gap-2 text-navy-foreground/70">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-foreground/15 bg-navy-foreground/5 text-steel-bright"><a.icon className="h-4 w-4" /></span>
                  <span className="text-xs font-semibold">{a.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={120} className="relative">
            <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-cta/25 blur-3xl" aria-hidden />
            <AuditForm glass />
          </Reveal>
        </div>
      </section>

      {/* SERVICES */}
      <Section className="bg-background" >
        <Reveal className="mb-12 max-w-2xl">
          <Eyebrow>Services</Eyebrow>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-5xl">Everything you need to grow</h2>
        </Reveal>
        <Reveal delay={100}>
          <ServiceGroups />
        </Reveal>
      </Section>

      {/* HOW IT WORKS */}
      <Section className="slant-top relative bg-soft">
        <Reveal className="text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-5xl">Three simple steps</h2>
        </Reveal>
        <div className="relative mt-16">
          <div className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-steel/25 md:block" aria-hidden />
          <div className="grid gap-10 md:grid-cols-3 md:gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <div className="relative flex flex-col items-center rounded-3xl bg-card p-8 text-center shadow-lg shadow-navy/5 md:bg-transparent md:shadow-none">
                  <span className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-navy font-display text-2xl font-extrabold italic text-navy-foreground shadow-xl shadow-navy/25">
                    0{i + 1}
                  </span>
                  <s.icon className="mt-6 h-7 w-7 text-cta" />
                  <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-muted-foreground">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* SAMPLE AUDIT */}
      <Section className="slant-top relative bg-navy text-navy-foreground">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <Eyebrow light>Sample audit</Eyebrow>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-5xl">Clear findings. Practical next steps.</h2>
            <p className="mt-4 text-lg text-navy-foreground/70">
              No vague scores or ratings. Every section explains what we found, why it matters, and exactly what to do about it.
            </p>
            <AuditButton className="mt-8" label="Get My Free Audit" />
          </Reveal>
          <Reveal delay={120}>
            <div className="rotate-[-1.5deg] rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-[0_40px_80px_-20px_oklch(0.1_0.05_266/0.6)] transition-transform duration-500 hover:rotate-0 sm:p-8">
              <div className="flex items-center justify-between border-b border-border pb-4">
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
          </Reveal>
        </div>
      </Section>

      {/* ABOUT */}
      <Section className="slant-top bg-background">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow>About us</Eyebrow>
          <p className="mt-6 font-display text-2xl font-semibold leading-relaxed text-navy sm:text-3xl">
            We're a marketing and digital solutions company. We help businesses of every size, from startups to established
            companies, grow with smart marketing and the right digital tools. From launching a new business to running a full
            marketing campaign, we plan it, build it and deliver it.
          </p>
        </Reveal>
      </Section>

      {/* FINAL CTA */}
      <section className="slant-top relative overflow-hidden bg-navy px-4 pb-24 pt-28 text-center text-navy-foreground">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cta/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-16 bottom-0 select-none font-display text-[18rem] font-extrabold italic leading-none text-navy-foreground/[0.05]" aria-hidden>X</div>
        <Reveal className="relative mx-auto max-w-3xl">
          <h2 className="text-3xl font-extrabold sm:text-5xl">Ready to see what's holding you back?</h2>
          <p className="mx-auto mt-4 max-w-xl text-navy-foreground/70">Get a free, written audit of your business in 48 hours. No login. No obligation.</p>
          <AuditButton className="mt-8 px-8 py-4 text-base" />
        </Reveal>
      </section>
    </>
  );
}
