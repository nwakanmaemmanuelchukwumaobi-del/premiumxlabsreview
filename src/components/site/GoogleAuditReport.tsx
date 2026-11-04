import { useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SOCIAL_REVIEW, ADS_NOTE, websiteDomain, type GoogleReport } from "@/lib/google-audit";

const CALL_URL = "https://wa.me/2349034340796?text=" + encodeURIComponent("Hi premiumxlabs, I'd like to book a free 15-minute call about my audit.");
const speedLabel = (seconds: number | null) => seconds === null ? "Not checked" : `${seconds.toFixed(1)}s · ${seconds < 1.8 ? "Fast" : seconds <= 3 ? "Could be faster" : "Slow"}`;
function CallButton() { return <Button asChild className="mt-6 h-auto w-full gap-2 whitespace-normal rounded-lg bg-report-accent px-4 py-4 font-bold text-report-accent-foreground hover:bg-report-accent/90"><a href={CALL_URL} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 shrink-0" />Book a free 15-minute call<ArrowUpRight className="h-4 w-4 shrink-0" /></a></Button>; }

export function GoogleAuditReport({ report, reportUrl }: { report: GoogleReport; reportUrl?: string | null }) {
  const [view, setView] = useState<"summary" | "details">("summary");
  const found = report.searches.slice(0, 4).filter(s => s.status === "completed" && s.position !== null).length;
  const completed = report.searches.slice(0, 4).filter(s => s.status === "completed").length;
  const nameCheck = report.searches[4];
  return <div className="google-audit-report text-report-foreground">
    <header className="border-b border-report-foreground/15 pb-5">
      <p className="text-xs font-bold uppercase tracking-widest text-report-accent">YOUR FREE BUSINESS AUDIT</p>
      <h2 className="mt-3 break-words text-2xl font-bold leading-tight">{report.business}</h2>
      <p className="mt-2 break-words text-sm text-report-muted">{report.location}</p>
      <p className="mt-2 break-all text-xs text-report-muted">{report.website || "No website provided"}</p>
      <div className="mt-5 grid grid-cols-2 gap-2" aria-label="Audit report pages">
        {(["summary", "details"] as const).map((mode, i) => <Button key={mode} aria-pressed={view === mode} variant="ghost" onClick={() => setView(mode)} className={view === mode ? "bg-report-accent text-report-accent-foreground hover:bg-report-accent/90" : "border border-report-foreground/20 text-report-foreground hover:bg-report-foreground/10"}>{i + 1} · {mode === "summary" ? "Summary" : "Details"}</Button>)}
      </div>
    </header>
    {view === "summary" ? <section aria-label="Summary" className="pt-6">
      <div className="flex items-end gap-2"><span className="text-6xl font-bold text-report-accent">{report.score.coverage > 0 ? report.score.earned : "—"}</span><span className="pb-2 text-xl text-report-muted">/ 100</span></div>
      <p className="mt-3 text-sm leading-relaxed">{report.score.coverage === 0 ? "The automatic checks weren't available, but your request is saved for our team." : !report.score.complete ? "A first look, based only on the checks that completed." : report.score.earned >= 75 ? "Your business has a strong starting point online." : "There is room to make your business easier to find and contact."}</p>
      {!report.score.complete && <p className="mt-2 text-xs text-report-accent">Provisional score · {report.score.coverage} of 100 possible points checked. Unavailable checks are not scored.</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[{ label: "Google search", icon: completed === 0 ? "⚠️" : found === 4 ? "✅" : found === 0 ? "❌" : "⚠️", text: completed === 0 ? "Search checks unavailable" : `Found on page 1 for ${found} of ${completed} checked searches` }, { label: "Website speed", icon: report.speed.seconds === null ? "⚠️" : report.speed.seconds < 1.8 ? "✅" : report.speed.seconds <= 3 ? "⚠️" : "❌", text: speedLabel(report.speed.seconds) }, { label: "Social media", icon: "⚠️", text: SOCIAL_REVIEW }].map(tile => <div key={tile.label} className="min-w-0 rounded-lg border border-report-foreground/15 bg-report-foreground/5 p-4"><p className="text-sm font-bold">{tile.icon} {tile.label}</p><p className="mt-2 text-xs leading-relaxed text-report-muted">{tile.text}</p></div>)}
      </div>
      <h3 className="mt-7 text-base font-bold">Your next steps</h3>
      {report.fixes.length ? <ol className="mt-4 space-y-4">{report.fixes.map((fix, i) => <li key={fix} className="flex gap-3 text-sm leading-relaxed"><span className="font-bold text-report-accent">{i + 1}.</span><span>{fix}</span></li>)}</ol> : <p className="mt-3 text-sm leading-relaxed text-report-muted">{report.score.coverage === 0 ? "Our team will review your business and share the next steps within 24 hours." : "No clear fix was supported by the checks that completed. Our team will take a closer look."}</p>}
      <CallButton />
      <Button variant="ghost" className="mt-3 w-full gap-2 text-report-accent hover:bg-report-foreground/10" onClick={() => setView("details")}>See the details<ChevronRight className="h-4 w-4" /></Button>
    </section> : <section aria-label="Details" className="pt-6">
      <p className="text-xs leading-relaxed text-report-muted">Checked {new Date(report.checked_at).toLocaleDateString("en-GB")}. Rankings vary slightly by location and device. Website features are a first look, not proof of why a site ranks.</p>
      {report.searches.slice(0, 4).map((search, index) => <section key={index} className="border-b border-report-foreground/15 py-6">
        <p className="text-xs font-bold uppercase tracking-wider text-report-accent">SEARCH {index + 1}</p><h3 className="mt-2 break-words text-lg font-bold">“{search.query}”</h3>
        <p className="mt-3 text-sm font-bold">{search.status === "unavailable" ? "⚠️ Search check unavailable" : search.position === null ? "❌ Not on page 1" : `✅ You're #${search.position}, on page 1`}</p>
        <h4 className="mt-4 text-sm font-bold">What it means</h4><p className="mt-2 text-sm leading-relaxed text-report-muted">{search.status === "unavailable" ? "We couldn't complete this search, so we can't judge your position yet." : search.position !== null && search.position <= 3 ? "Buyers search for this when they need what your business offers. Your website is near the top, giving them a good chance to find you." : search.position !== null ? "Buyers search for this when they need what your business offers. Most buyers don't scroll this far; businesses above you may receive the inquiry first." : "Buyers search for this when they need what your business offers. Most don't scroll past page 1, so visible competitors may receive the inquiry instead."}</p>
        <h4 className="mt-5 text-sm font-bold">Who's winning</h4>
        <div className="mt-3 overflow-x-auto"><table className="w-full table-fixed text-left text-xs"><thead className="text-report-muted"><tr><th className="w-12 py-2 font-medium">Rank</th><th className="px-2 py-2 font-medium">Business</th><th className="w-24 py-2 font-medium">Mobile speed</th></tr></thead><tbody>{search.competitors.map(c => <tr key={c.link} className="border-t border-report-foreground/10"><td className="py-3 align-top">#{c.position}</td><td className="break-words px-2 py-3 align-top"><span>{c.title}</span><span className="mt-1 block break-all text-report-muted">{websiteDomain(c.link)}</span></td><td className="py-3 align-top">{speedLabel(c.speed.seconds)}</td></tr>)}<tr className="border-t border-report-accent/40 bg-report-accent/10 font-semibold"><td className="py-3 align-top">{search.status === "unavailable" ? "—" : search.position ? `#${search.position}` : "—"}</td><td className="break-words px-2 py-3 align-top">{report.business}<span className="mt-1 block text-report-accent">Your business</span></td><td className="py-3 align-top">{speedLabel(report.speed.seconds)}</td></tr></tbody></table></div>
        {!search.competitors.length && <p className="mt-2 text-xs text-report-muted">{search.status === "completed" ? "No eligible competitor websites found in these results." : "Competitor results unavailable."}</p>}
        <h4 className="mt-5 text-sm font-bold">Why they may be ahead</h4><div className="mt-2 space-y-3 text-sm leading-relaxed text-report-muted">{search.competitors.length ? search.competitors.map(c => <p key={c.link}><strong className="text-report-foreground">{websiteDomain(c.link)}: </strong>{c.comparison || "Homepage and speed weren't checked for this search. We can't explain its position from ranking alone."}</p>) : <p>There isn't enough evidence to compare website features.</p>}</div>
      </section>)}
      {nameCheck?.status === "completed" && nameCheck.position === null && <section className="border-b border-report-foreground/15 py-6"><h3 className="font-bold">❌ Name check</h3><p className="mt-2 text-sm leading-relaxed text-report-muted">We didn't find your website on page 1 for “{nameCheck.query}”. Even people looking for your business by name may have trouble reaching you.</p></section>}
      <section className="border-b border-report-foreground/15 py-6"><h3 className="font-bold">Your Google reviews</h3><p className="mt-2 text-sm text-report-muted">{report.maps.status === "matched" ? `${report.maps.rating === null ? "Rating unavailable" : `${report.maps.rating} / 5`}${report.maps.reviews === null ? " · Review count unavailable" : ` · ${report.maps.reviews} reviews`}` : report.maps.status === "unconfirmed" ? "We found possible listings but couldn't confidently match one to your business." : report.maps.status === "not found" ? "We didn't find a matching listing in the Maps results checked." : "Google rating and review count were unavailable."}</p></section>
      <section className="py-6"><h3 className="font-bold">⚠️ Social media</h3><p className="mt-2 text-sm leading-relaxed text-report-muted">{SOCIAL_REVIEW}</p></section>
      <p className="border-l-2 border-report-accent pl-4 text-sm leading-relaxed text-report-muted">{ADS_NOTE}</p><CallButton />
      <Button variant="ghost" className="mt-3 w-full gap-2 text-report-accent hover:bg-report-foreground/10" onClick={() => setView("summary")}><ChevronLeft className="h-4 w-4" />Back to summary</Button>
    </section>}
    {reportUrl && <p className="mt-5 break-all text-center text-xs text-report-muted"><a href={reportUrl} className="underline" target="_blank" rel="noreferrer">Open your saved report</a></p>}
  </div>;
}