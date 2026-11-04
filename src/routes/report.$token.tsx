import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getAuditReport } from "@/lib/audit-report.functions";
import { GoogleAuditReport } from "@/components/site/GoogleAuditReport";
import { AuditProgress } from "@/components/site/AuditProgress";
const reportQuery = (token: string) => queryOptions({ queryKey: ["saved-report",token], queryFn: () => /^[a-f0-9]{64}$/.test(token) ? getAuditReport({ data: { token } }) : Promise.resolve(null) });
export const Route = createFileRoute("/report/$token")({
  staticData: { sitemap: false },
  loader: ({ context,params }) => context.queryClient.ensureQueryData(reportQuery(params.token)),
  head: () => ({ meta: [{ title: "Your Online Visibility Report | premiumxlabs" }, { name: "description", content: "Your premiumxlabs online visibility report with real Google searches, phone speed comparisons and practical next steps." }, { property: "og:title", content: "Your Online Visibility Report | premiumxlabs" }, { property: "og:description", content: "Your saved online visibility findings and next steps from premiumxlabs." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex,nofollow,noarchive" }, { name: "referrer", content: "no-referrer" }] }),
  component: ReportPage,
});
function ReportPage() {
  const { token } = Route.useParams();
  const { data: report } = useSuspenseQuery(reportQuery(token));
  return <div className="min-h-dvh bg-report px-5 py-10 text-report-foreground sm:px-8 sm:py-14"><div className="mx-auto max-w-3xl"><p className="mb-10 font-display text-lg font-bold">premiumxlabs</p>{report ? report.city ? <AuditProgress token={token} /> : <GoogleAuditReport report={report} /> : <section><h1 className="text-2xl font-bold">Report unavailable</h1><p className="mt-4 text-report-muted">This link may be incorrect or no longer active. Message us for help with your report.</p></section>}</div></div>;
}