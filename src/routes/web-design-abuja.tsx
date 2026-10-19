import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Globe, MessageCircle, MapPin } from "lucide-react";
import { AuditButton } from "@/components/site/Chrome";
import { DIGITAL_SERVICES, LOCATION, WHATSAPP_URL } from "@/lib/site";
import logo from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/web-design-abuja")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Web Design in Abuja | premiumxlabs" },
      { name: "description", content: "Website design and development from premiumxlabs in Abuja, Nigeria. Present your business online and give visitors a way to enquire. Start with a free audit." },
      { property: "og:title", content: "Web Design in Abuja | premiumxlabs" },
      { property: "og:description", content: "Website design and development from premiumxlabs in Abuja, Nigeria. Present your business online and give visitors a way to enquire. Start with a free audit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WebDesignAbuja,
});

function WebDesignAbuja() {
  const website = DIGITAL_SERVICES.find((service) => service.title === "Websites");
  return (
    <>
      <section className="bg-navy px-4 py-16 text-navy-foreground md:py-20">
        <div className="mx-auto max-w-6xl">
          <Link to="/services" className="text-sm text-navy-foreground/70 hover:underline">Services / Websites</Link>
          <img src={logo.url} alt="premiumxlabs" className="mt-8 h-16 w-16 rounded-lg" />
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">Web design in Abuja</h1>
          <p className="mt-5 max-w-2xl text-lg text-navy-foreground/80">premiumxlabs designs and develops websites that introduce your business and give visitors a way to enquire. Based in Abuja, Nigeria, we bring website work together with marketing and digital solutions.</p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <AuditButton />
            <Link to="/services" search={{ service: "Websites" }} hash="request" className="inline-flex items-center gap-2 text-sm font-semibold hover:underline">Request website design <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          <div>
            <Globe className="h-8 w-8 text-cta" />
            <h2 className="mt-4 text-2xl font-bold">What website design covers</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">{website?.includes}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Who it helps</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">{website?.audience}</p>
            <p className="mt-4 leading-relaxed text-muted-foreground">Whether you are introducing a new business or reviewing an existing online presence, tell us what you offer and what visitors need to know. Your request helps us understand the website work you need.</p>
          </div>
        </div>
      </section>
      <section className="bg-soft px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold">Not sure where to start?</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">Our free business audit reviews your website, social media, Google presence, branding and ads. Get written findings and recommendations within 48 hours, by WhatsApp or email. No login or payment required.</p>
            <AuditButton className="mt-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Discuss your website</h2>
            <p className="mt-4 text-muted-foreground">Already know what you need? Request the Websites service with a short description of your business and the website you have in mind.</p>
            <Link to="/services" search={{ service: "Websites" }} hash="request" className="mt-5 inline-flex items-center gap-2 font-semibold text-cta hover:underline">Request This Service <ArrowRight className="h-4 w-4" /></Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-2 text-sm font-semibold text-steel hover:underline"><MessageCircle className="h-4 w-4" /> Talk on WhatsApp</a>
            <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {LOCATION}</p>
          </div>
        </div>
      </section>
    </>
  );
}