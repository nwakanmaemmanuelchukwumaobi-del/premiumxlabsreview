import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getAuditReport } from "@/lib/audit-report.functions";
import { GoogleAuditReport } from "@/components/site/GoogleAuditReport";
import { Button } from "@/components/ui/button";
import { WHATSAPP_URL } from "@/lib/site";
import logo from "@/assets/logo.webp.asset.json";

const reportQuery = (token: string) => queryOptions({ queryKey: ["audit-report", token], queryFn: () => /^[a-f0-9]{64}$/.test(token) ? getAuditReport({ data: { token } }) : Promise.resolve(null), staleTime: 0 });
export const Route = createFileRoute("/audit_/report/$token")({
  staticData: { sitemap: false },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(reportQuery(params.token)),
  head: () => ({ meta: [{ title: "Your Business Audit Report | premiumxlabs" }, { name: "description", content: "Your saved premiumxlabs business audit with Google visibility, mobile website speed and next steps." }, { property: "og:title", content: "Your Business Audit Report | premiumxlabs" }, { property: "og:description", content: "A private-link business audit and practical next steps from premiumxlabs." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex,nofollow,noarchive" }, { name: "referrer", content: "no-referrer" }] }),
  component: SavedReportPage,
});
function SavedReportPage() {
  const { token } = Route.useParams();
  const { data: report } = useSuspenseQuery(reportQuery(token));
  return <div className="min-h-screen bg-report px-4 py-6 text-report-foreground sm:py-12"><div className="instant-report mx-auto max-w-3xl"><header className="mb-8 flex items-center gap-3"><img src={logo.url} alt="premiumxlabs logo" width={36} height={36} className="h-9 w-9 rounded-md" /><span className="font-display text-lg font-bold">premiumxlabs</span></header>{report ? <GoogleAuditReport report={report} /> : <section className="py-12"><h1 className="text-2xl font-bold">Report unavailable</h1><p className="mt-4 text-sm text-report-muted">This link may be incorrect or no longer active. Message us for help with your report.</p><Button asChild className="mt-6 bg-report-accent text-report-accent-foreground"><a href={WHATSAPP_URL}>Message us on WhatsApp</a></Button></section>}</div></div>;
}