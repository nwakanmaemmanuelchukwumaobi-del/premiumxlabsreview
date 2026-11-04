import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { getAuditProgress, kickAuditReport } from "@/lib/audit-report.functions";
import { REPORT_STEPS } from "@/lib/google-audit";
import { GoogleAuditReport } from "./GoogleAuditReport";
import { Button } from "@/components/ui/button";

export function AuditProgress({ token }: { token: string }) {
  const { data } = useQuery({ queryKey: ["audit-progress", token], queryFn: () => getAuditProgress({ data: { token } }), refetchInterval: query => ["complete", "failed"].includes(query.state.data?.status ?? "") ? false : 3000, retry: false });
  const [slow, setSlow] = useState(false);
  useEffect(() => { const kick = setTimeout(() => { kickAuditReport({ data: { token } }).catch(() => undefined); }, 4000); const late = setTimeout(() => setSlow(true), 90000); return () => { clearTimeout(kick); clearTimeout(late); }; }, [token]);
  const finished = data?.status === "complete";
  const failed = data?.status === "failed";
  const steps = data?.steps ?? [];
  return <div className="mx-auto max-w-3xl">
    {!finished && <section className="pb-10" aria-live="polite"><p className="text-xs font-bold uppercase tracking-widest text-report-accent">YOUR FREE AUDIT</p><h2 className="mt-5 text-3xl font-bold">Finding your next opportunity.</h2><p className="mt-4 text-base leading-relaxed text-report-muted">This takes about a minute. We'll also email you the link.</p><div role="progressbar" aria-label="Audit progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={steps.length * 25} className="my-8 h-2 overflow-hidden rounded-full bg-report-foreground/10"><svg viewBox="0 0 100 4" className="h-full w-full" preserveAspectRatio="none"><rect width={steps.length * 25} height="4" className="fill-report-accent" /></svg></div><ol className="space-y-5">{REPORT_STEPS.map((step,i) => <li key={step} className="flex items-center gap-3 text-base">{steps.includes(i) ? <CheckCircle2 className="h-5 w-5 shrink-0 text-report-success" /> : <Loader2 className={`h-5 w-5 shrink-0 text-report-accent ${i === steps.length ? "animate-spin motion-reduce:animate-none" : "opacity-30"}`} />}<span className={steps.includes(i) ? "text-report-foreground" : "text-report-muted"}>{step}</span></li>)}</ol>{(failed || slow) && <p className="mt-7 text-report-muted">We're finishing your report. We'll email you the link shortly.</p>}<Button asChild variant="ghost" className="mt-7 text-report-accent hover:bg-report-foreground/10"><a href={`https://premiumxlabs.com/report/${token}`}>Open your saved report</a></Button></section>}
    {data?.report && (finished || steps.length > 0) && <GoogleAuditReport report={data.report} pending={!finished} />}
  </div>;
}