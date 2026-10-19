import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, MapPin } from "lucide-react";
import { ContactForm } from "@/components/site/SimpleForms";
import { CONTACT_EMAIL, LOCATION, WHATSAPP_URL } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Contact | premiumxlabs" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Contact premiumxlabs by WhatsApp, email or our contact form. Based in Abuja, Nigeria." },
      { property: "og:title", content: "Contact | premiumxlabs" },
      { property: "og:description", content: "Talk to premiumxlabs about growing your business." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const items = [
    { icon: MessageCircle, label: "WhatsApp", value: "+234 903 434 0796", href: WHATSAPP_URL },
    { icon: Mail, label: "Email", value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
    { icon: MapPin, label: "Location", value: LOCATION },
  ];
  return (
    <section className="bg-soft px-4 py-16 md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-cta">Contact</p>
          <h1 className="mt-3 text-4xl font-extrabold text-navy sm:text-5xl">Let's talk about your business.</h1>
          <div className="mt-10 space-y-4">
            {items.map((i) => {
              const inner = (
                <div className="flex items-center gap-4 rounded-2xl bg-card p-5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-cta"><i.icon className="h-5 w-5" /></span>
                  <div><p className="text-xs font-semibold uppercase text-muted-foreground">{i.label}</p><p className="font-semibold">{i.value}</p></div>
                </div>
              );
              return i.href ? <a key={i.label} href={i.href} target="_blank" rel="noreferrer" className="block">{inner}</a> : <div key={i.label}>{inner}</div>;
            })}
          </div>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
