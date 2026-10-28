import { createFileRoute } from "@tanstack/react-router";
import { Rocket, Target, Wrench } from "lucide-react";
import { AuditButton } from "@/components/site/Chrome";
import { sharingMeta } from "@/lib/sharing-meta";

export const Route = createFileRoute("/about")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "About | premiumxlabs" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "premiumxlabs helps businesses of every size grow with smart marketing and the right digital tools." },
      { property: "og:title", content: "About | premiumxlabs" },
      { property: "og:description", content: "We plan it, build it and deliver it." },
      ...sharingMeta("/about", "About | premiumxlabs", "We plan it, build it and deliver it."),
    ],
  }),
  component: About,
});

function About() {
  const vals = [
    { icon: Target, t: "Plan it", d: "Clear strategy grounded in what your business actually needs." },
    { icon: Wrench, t: "Build it", d: "Campaigns, brands, websites and tools crafted with care." },
    { icon: Rocket, t: "Deliver it", d: "We launch, measure and keep moving you forward." },
  ];
  return (
    <>
      <section className="bg-soft px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-widest text-cta">About premiumxlabs</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-navy sm:text-5xl">
            We're a marketing and digital solutions company.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            We help businesses of every size, from startups to established companies, grow with smart marketing and the right
            digital tools. From launching a new business to running a full marketing campaign, we plan it, build it and deliver it.
          </p>
        </div>
      </section>
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {vals.map((v) => (
            <div key={v.t} className="rounded-3xl border border-border p-8">
              <v.icon className="h-8 w-8 text-cta" />
              <h3 className="mt-4 text-xl font-bold">{v.t}</h3>
              <p className="mt-2 text-muted-foreground">{v.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 text-center"><AuditButton className="px-8 py-4" /></div>
      </section>
    </>
  );
}
