import { z } from "zod";
import type { auditSchema } from "./audit-fields";

export const BREAKDOWN_END = "This is a quick look at your website only. Your full audit covering Google, social media, branding and ads is being prepared and will be sent on WhatsApp within 48 hours.";
export const UNREACHABLE = "We couldn't reach this website. Please double-check the address, or it may be temporarily unavailable.";
export const breakdownSchema = z.object({ problems: z.array(z.object({ fact: z.string(), text: z.string() }).strict()) }).strict();
export type Breakdown = { problems: string[]; closing: string };
type Checks = { status: string; page: Record<string, unknown>; pagespeed: Record<string, unknown> };
const record = (v: unknown): Record<string, unknown> => typeof v === "object" && v !== null ? v as Record<string, unknown> : {};
export function firstContentBand(seconds: number) {
  return seconds < 1.8 ? "good" : seconds <= 3 ? "needs improvement" : "poor";
}
export function keyWebsiteFacts(checks: Checks, answers: Pick<z.infer<typeof auditSchema>, "running_ads" | "ad_platforms" | "ad_platform_other" | "goals" | "goals_other">) {
  const page = checks.page.status === "completed" ? checks.page : {};
  const fcp = record(record(checks.pagespeed.metrics)["first-contentful-paint"]).numericValue;
  const seconds = checks.pagespeed.status === "completed" && typeof fcp === "number" && Number.isFinite(fcp) && fcp >= 0 ? fcp / 1000 : null;
  const text = (k: string) => typeof page[k] === "string" ? String(page[k]).slice(0, 2000) : null;
  const flag = (k: string) => typeof page[k] === "boolean" ? page[k] as boolean : null;
  return {
    first_content_seconds_mobile: seconds,
    uses_https: flag("uses_https"), page_title: text("title"), meta_description: text("meta_description"), main_headline: text("main_headline"),
    contact_or_action_found: flag("contact_or_action_present"), social_links_found: flag("social_links_present"),
    running_ads: answers.running_ads, ad_platforms: answers.ad_platforms, ad_platform_other: answers.ad_platform_other,
    goals: answers.goals, goals_other: answers.goals_other,
  };
}
export function supportedProblems(f: ReturnType<typeof keyWebsiteFacts>, pageCompleted: boolean) {
  const ids: string[] = [];
  if (f.first_content_seconds_mobile !== null && firstContentBand(f.first_content_seconds_mobile) !== "good") ids.push("slow_first_content");
  if (pageCompleted) {
    if (f.uses_https === false) ids.push("no_https");
    if (!f.page_title) ids.push("missing_title");
    if (!f.meta_description) ids.push("missing_description");
    if (!f.main_headline) ids.push("missing_headline");
    if (f.contact_or_action_found === false) ids.push("missing_contact");
    if (f.social_links_found === false) ids.push("missing_social_links");
  }
  return ids;
}
export function normalizeBreakdown(value: unknown, allowed: string[], unavailable: boolean): Breakdown | null {
  const parsed = breakdownSchema.safeParse(value);
  if (!parsed.success) return null;
  const seen = new Set<string>();
  const problems = parsed.data.problems.filter(p => allowed.includes(p.fact) && !seen.has(p.fact) && !!seen.add(p.fact))
    .map(p => p.text.trim()).filter(t => t.length > 0 && t.length <= 650 && !/\b(100|score|FCP|LCP|HTTPS|SEO|meta|latency|render|lighthouse)\b/i.test(t)).slice(0, 5);
  if (allowed.length && !problems.length) return null;
  if (unavailable) problems.unshift(UNREACHABLE);
  if (!problems.length) problems.push("We didn't find a clear problem in the website checks that completed. This quick look doesn't cover everything, so your full audit will take a closer look.");
  return { problems, closing: BREAKDOWN_END };
}