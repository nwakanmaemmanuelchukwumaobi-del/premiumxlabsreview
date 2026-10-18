import { Link } from "@tanstack/react-router";
import { Megaphone, Code2, ArrowRight } from "lucide-react";
import { MARKETING_SERVICES, DIGITAL_SERVICES } from "@/lib/site";

export function ServiceGroups() {
  const groups = [
    { title: "Marketing", icon: Megaphone, items: MARKETING_SERVICES },
    { title: "Digital Solutions", icon: Code2, items: DIGITAL_SERVICES },
  ];
  return (
    <div className="space-y-14">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-navy-foreground"><g.icon className="h-5 w-5" /></span>
            <h3 className="text-2xl font-bold">{g.title}</h3>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((s) => (
              <div key={s.title} className="flex flex-col rounded-2xl border border-steel/25 bg-card p-6 transition duration-300 hover:-translate-y-1.5 hover:border-cta/50 hover:shadow-[0_24px_50px_-16px_oklch(0.55_0.17_258/0.35)]">
                <h4 className="text-lg font-bold">{s.title}</h4>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.desc}</p>
                <Link to="/services" search={{ service: s.title }} hash="request" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cta hover:gap-2.5 transition-all">
                  Request This Service <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
