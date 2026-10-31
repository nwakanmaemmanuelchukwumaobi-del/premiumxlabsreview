import { createFileRoute } from "@tanstack/react-router";
import { Gift, Unlock, Clock } from "lucide-react";
import logo from "@/assets/logo.webp.asset.json";
import { sharingMeta } from "@/lib/sharing-meta";
import { AuditForm } from "@/components/site/AuditForm";

export const Route = createFileRoute("/audit")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Get Your Free Business Audit | premiumxlabs" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Free, no login, report in 24 hours. Find out what's holding your business back." },
      { property: "og:title", content: "Get Your Free Business Audit | premiumxlabs" },
      { property: "og:description", content: "Free, no login, written report within 24 hours." },
      ...sharingMeta("/audit", "Get Your Free Business Audit | premiumxlabs", "Free, no login, written report within 24 hours."),
    ],
  }),
  component: AuditPage,
});

const BENEFITS = [
  { icon: Gift, text: "100% free" },
  { icon: Unlock, text: "No login needed" },
  { icon: Clock, text: "Report in 24 hours" },
];

function AuditPage() {
  return (
    <div className="min-h-screen bg-soft px-4 py-8 md:py-14">
      <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="lg:sticky lg:top-14">
          <div className="flex items-center gap-2">
            <img src={logo.url} alt="premiumxlabs logo" width={36} height={36} loading="eager" decoding="async" className="h-9 w-9 rounded-lg" />
            <span className="font-display text-lg font-extrabold text-navy">premiumxlabs</span>
          </div>
          <h1 className="mt-8 text-4xl font-extrabold leading-[1.05] text-navy sm:text-5xl">
            Find Out What's Holding Your Business Back.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Tell us about your business and get a clear, written audit report within 24 hours.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {BENEFITS.map((b) => (
              <li key={b.text} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 font-semibold">
                <b.icon className="h-5 w-5 text-cta" /> {b.text}
              </li>
            ))}
          </ul>
        </div>
        <AuditForm />
      </div>
    </div>
  );
}
