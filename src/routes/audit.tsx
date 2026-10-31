import { createFileRoute } from "@tanstack/react-router";
import { Gift, Unlock, Clock } from "lucide-react";
import logo from "@/assets/logo.webp.asset.json";
import { sharingMeta } from "@/lib/sharing-meta";
import { AuditForm } from "@/components/site/AuditForm";

export const Route = createFileRoute("/audit")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Get a Free Business Audit | premiumxlabs" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Free, no login, report in 24 hours. Find out what's holding your business back." },
      { property: "og:title", content: "Get a Free Business Audit | premiumxlabs" },
      { property: "og:description", content: "Find out what's holding your business back. Get your free audit within 24 hours." },
      ...sharingMeta("/audit", "Get a Free Business Audit | premiumxlabs", "Find out what's holding your business back. Get your free audit within 24 hours."),
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
    <div className="min-h-screen bg-soft px-4 py-4 md:py-14">
      <div className="mx-auto grid max-w-6xl items-start gap-5 md:gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="lg:sticky lg:top-14">
          <header className="flex items-center gap-2">
            <img src={logo.url} alt="premiumxlabs logo" width={36} height={36} loading="eager" decoding="async" className="h-9 w-9 rounded-lg" />
            <span className="font-display text-lg font-extrabold text-navy">premiumxlabs</span>
          </header>
          <h1 className="mt-4 text-3xl font-extrabold leading-[1.05] text-navy sm:mt-8 sm:text-5xl">
            Find Out What's Holding Your Business Back.
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">
            Tell us about your business and get a clear, written audit report within 24 hours.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 sm:mt-6 sm:grid sm:grid-cols-3 sm:gap-3 lg:grid-cols-1">
            {BENEFITS.map((b) => (
              <li key={b.text} className="flex items-center gap-2 text-xs font-semibold sm:gap-3 sm:rounded-2xl sm:bg-card sm:px-4 sm:py-3 sm:text-base">
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
