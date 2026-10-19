import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ServiceGroups } from "@/components/site/ServiceGrid";
import { ServiceRequestForm } from "@/components/site/SimpleForms";

export const Route = createFileRoute("/services")({
  validateSearch: z.object({ service: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Services | premiumxlabs" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Marketing, ads, branding, websites, apps and AI automation from premiumxlabs." },
      { property: "og:title", content: "Services | premiumxlabs" },
      { property: "og:description", content: "Marketing and digital solutions to grow your business." },
    ],
  }),
  component: Services,
});

function Services() {
  const { service } = Route.useSearch();
  return (
    <>
      <section className="bg-soft px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-widest text-cta">Services</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold text-navy sm:text-5xl">Marketing and digital solutions, planned and delivered.</h1>
        </div>
      </section>
      <section className="px-4 py-16"><div className="mx-auto max-w-6xl"><ServiceGroups detailed /></div></section>
      <section id="request" className="scroll-mt-20 bg-soft px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold">Request a Service</h2>
            <p className="mt-3 text-muted-foreground">Know what you need? Tell us and we'll get back to you with next steps.</p>
            <div className="mt-8 rounded-2xl border border-cta/30 bg-card p-5">
              <p className="font-semibold">Not sure where to start?</p>
              <Link to="/audit" className="mt-1 inline-block font-semibold text-cta underline">Get a free audit →</Link>
            </div>
          </div>
          <ServiceRequestForm preset={service} />
        </div>
      </section>
    </>
  );
}
