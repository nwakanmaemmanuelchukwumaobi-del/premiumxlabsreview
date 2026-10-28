import { lazy, Suspense, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { auditSchema, submitAudit } from "@/lib/forms.functions";
import { WHATSAPP_URL } from "@/lib/site";
import { AD_OPTIONS, AD_PLATFORMS, AUDIT_GOALS, ONLINE_FIELDS, ONLINE_PLATFORMS, hasAdHistory } from "@/lib/audit-fields";
import { MultiPicker, OnlinePresencePicker, type OnlineEntry } from "@/components/site/AuditPicker";
import type { Breakdown } from "@/lib/instant-breakdown";
import { Button } from "@/components/ui/button";
import { SUBMISSION_ERROR } from "@/lib/submission-errors";

const loadReport = () => import("@/components/site/InstantReport");
const InstantReport = lazy(() => loadReport().then(module => ({ default: module.InstantReport })));

const CHALLENGES = ["Few customers", "Low sales", "No online presence", "Weak branding", "Other"];

function toBase64(file: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function AuditForm({ glass = false }: { glass?: boolean }) {
  const send = useServerFn(submitAudit);
  const [ads, setAds] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [onlineEntries, setOnlineEntries] = useState<OnlineEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; biz: string; pref: string } | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportClient, setReportClient] = useState<{ name: string; biz: string; pref: string } | null>(null);
  const [reportWebsite, setReportWebsite] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string | null)?.trim() || undefined;
    const file = fd.get("screenshot") as File | null;
    if (file && file.size > 5 * 1024 * 1024) return setError("Screenshot must be under 5MB.");
    const payload = {
      name: get("name"), business_name: get("business_name"), email: get("email"), whatsapp: get("whatsapp"),
      industry_location: get("industry_location"), challenge: get("challenge"),
      online_links: onlineEntries.map(({ platform }) => ({
        platform, link: get(`online_link_${platform}`), other_name: platform === "Other" ? get("online_other_name") : null,
      })),
      goals, goals_other: get("goals_other"),
      running_ads: get("running_ads"), ad_platforms: hasAdHistory(ads) ? platforms : [],
      ad_platform_other: get("ad_platform_other"), ad_spend: get("ad_spend"),
      report_preference: get("report_preference"),
      screenshot: undefined as { name: string; type: string; base64: string } | undefined,
    };
    try {
      if (file && file.size > 0) payload.screenshot = { name: file.name, type: file.type, base64: await toBase64(file) };
    } catch {
      return setError(SUBMISSION_ERROR);
    }
    const parsed = auditSchema.safeParse(payload);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the form.");
    setBusy(true);
    setReportClient({ name: parsed.data.name, biz: parsed.data.business_name, pref: parsed.data.report_preference });
    setReportWebsite(parsed.data.online_links.find(entry => entry.platform === "Website")?.link ?? null);
    setReportOpen(true);
    try {
      const response = await send({ data: parsed.data });
      setBreakdown(response.breakdown);
      setDone({ name: parsed.data.name, biz: parsed.data.business_name, pref: parsed.data.report_preference });
    } catch {
      setError(SUBMISSION_ERROR);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <>
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-2xl shadow-navy/10">
        <CheckCircle2 className="mx-auto h-14 w-14 text-cta" />
        <h3 className="mt-4 text-2xl font-bold">Thank you, {done.name}.</h3>
        <p className="mt-3 text-muted-foreground">
          Your audit request has been received. Our team will review <strong className="text-navy">{done.biz}</strong> and
          send your full report via <strong className="text-navy">{done.pref}</strong> within 48 hours.
        </p>
        <p className="mt-4 text-sm">
          Questions? <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="font-semibold text-cta underline">Message us on WhatsApp.</a>
        </p>
        <Button variant="outline" className="mt-6" onClick={() => setReportOpen(true)}>{breakdown ? "View my instant breakdown" : "View confirmation"}</Button>
      </div>
      {reportOpen && <Suspense fallback={null}><InstantReport open={reportOpen} onOpenChange={setReportOpen} busy={busy} breakdown={breakdown} client={reportClient} website={reportWebsite} error={error} /></Suspense>}
      </>
    );

  const hasAds = hasAdHistory(ads);
  const L = "mb-1.5 block text-sm font-medium";

  return (
    <>
    <form onSubmit={onSubmit} onFocus={() => { void loadReport(); }} onPointerEnter={() => { void loadReport(); }} className={`relative rounded-3xl border p-6 shadow-2xl sm:p-8 ${glass ? "border-navy-foreground/15 bg-navy-foreground/95 shadow-navy/40 backdrop-blur-xl" : "border-border bg-card shadow-navy/10"}`}>
      <div className="mb-5">
        <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-steel">100% Free · No login</span>
        <h3 className="mt-3 text-xl font-bold">Request your free business audit</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={L}>Your name</label><input name="name" className="field" required /></div>
        <div><label className={L}>Business name</label><input name="business_name" className="field" required /></div>
        <div><label className={L}>Email</label><input name="email" type="email" className="field" required /></div>
        <div><label className={L}>WhatsApp number</label><input name="whatsapp" type="tel" className="field" placeholder="+234…" required /></div>
        <div className="sm:col-span-2"><label className={L}>Industry & location</label><input name="industry_location" className="field" placeholder="e.g. Restaurant, Abuja" required /></div>
        <OnlinePresencePicker entries={onlineEntries} onChange={setOnlineEntries} fields={ONLINE_FIELDS} platforms={ONLINE_PLATFORMS} />
        <div className="sm:col-span-2">
          <label className={L}>Biggest challenge</label>
          <select name="challenge" className="field" required defaultValue="">
            <option value="" disabled>Select one</option>
            {CHALLENGES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <MultiPicker label="What do you want to achieve?" options={AUDIT_GOALS} value={goals} onChange={setGoals} otherName="goals_other" otherLabel="Other goal" />
        <div className="sm:col-span-2">
          <label className={L}>Are you running ads now?</label>
          <select name="running_ads" className="field" required value={ads} onChange={(e) => setAds(e.target.value)}>
            <option value="" disabled>Select one</option>
            {AD_OPTIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {hasAds && (
          <>
            <MultiPicker label="Which platforms?" options={AD_PLATFORMS} value={platforms} onChange={setPlatforms} otherName="ad_platform_other" otherLabel="Other platform" />
            <div className="sm:col-span-2"><label className={L}>Rough monthly ad spend</label><input name="ad_spend" className="field" placeholder="e.g. ₦150,000" /></div>
            <div className="sm:col-span-2"><label className={L}>Ad results screenshot (optional)</label><input name="screenshot" type="file" accept="image/*" className="field text-sm" /></div>
          </>
        )}
        <div className="sm:col-span-2">
          <label className={L}>Send my report via</label>
          <div className="grid grid-cols-2 gap-3">
            {["WhatsApp", "Email"].map((p, i) => (
              <label key={p} className="flex cursor-pointer items-center gap-2 rounded-xl border border-input px-4 py-3 has-[:checked]:border-cta has-[:checked]:bg-accent">
                <input type="radio" name="report_preference" value={p} defaultChecked={i === 0} className="accent-cta" /> {p}
              </label>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <button disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cta px-6 py-4 font-semibold text-cta-foreground shadow-lg shadow-cta/25 transition hover:brightness-110 disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Get My Free Audit
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">Report delivered within 48 hours.</p>
    </form>
    {reportOpen && <Suspense fallback={null}><InstantReport open={reportOpen} onOpenChange={setReportOpen} busy={busy} breakdown={breakdown} client={reportClient} website={reportWebsite} error={error} /></Suspense>}
    </>
  );
}
