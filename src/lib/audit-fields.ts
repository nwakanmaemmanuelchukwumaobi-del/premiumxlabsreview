import { z } from "zod";
import { internationalPhoneSchema } from "./audit-phone";
import { profileScreenshotSchema } from "./profile-screenshots";

export const AD_OPTIONS = ["Yes and getting results", "Yes but not getting results", "No, never", "Used to"] as const;
export const AD_PLATFORMS = ["Facebook / Instagram (Meta)", "Google Ads", "TikTok", "YouTube", "Snapchat", "X (Twitter)", "LinkedIn", "Influencer or promoted posts", "Other"] as const;
export const AUDIT_GOALS = ["Generate more leads", "Increase sales", "Get more website visitors", "Build brand awareness", "Get more followers and engagement", "Get more calls or WhatsApp enquiries", "Get more foot traffic to my location", "Launch a new product or business", "Improve my online reputation", "Make my ads perform better", "Other"] as const;
export const ONLINE_PLATFORMS = ["Website", "Instagram", "Facebook", "TikTok", "X (Twitter)", "YouTube", "LinkedIn", "Snapchat", "Google Business Profile", "Other"] as const;
export const ONLINE_FIELDS: Record<(typeof ONLINE_PLATFORMS)[number], { label: string; placeholder: string }> = {
  Website: { label: "Website URL", placeholder: "https://yourbusiness.com" },
  Instagram: { label: "Instagram handle or link", placeholder: "@yourbusiness or https://instagram.com/yourbusiness" },
  Facebook: { label: "Facebook page name or link", placeholder: "Your page name or https://facebook.com/yourbusiness" },
  TikTok: { label: "TikTok handle or link", placeholder: "@yourbusiness or https://tiktok.com/@yourbusiness" },
  "X (Twitter)": { label: "X (Twitter) handle or link", placeholder: "@yourbusiness or https://x.com/yourbusiness" },
  YouTube: { label: "YouTube channel name or link", placeholder: "@yourbusiness or https://youtube.com/@yourbusiness" },
  LinkedIn: { label: "LinkedIn page name or link", placeholder: "Your page name or https://linkedin.com/company/yourbusiness" },
  Snapchat: { label: "Snapchat username or link", placeholder: "Your username or https://snapchat.com/add/yourbusiness" },
  "Google Business Profile": { label: "Google Business Profile link", placeholder: "Paste your Google Maps or business profile link" },
  Other: { label: "Other platform link", placeholder: "https://platform.com/yourbusiness" },
};
export const onlineLinksSchema = z.array(z.object({
  platform: z.enum(ONLINE_PLATFORMS),
  link: z.string().trim().min(1, "Please enter your selected platform’s handle or link").max(1000),
  other_name: z.string().trim().max(150).nullish(),
  screenshots: z.array(profileScreenshotSchema).max(3, "Add up to 3 screenshots per platform.").default([]),
}).superRefine((entry, ctx) => {
  if (entry.platform === "Other" && !entry.other_name)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["other_name"], message: "Please enter the other platform’s name" });
  if (entry.platform === "Website" && entry.screenshots.length)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["screenshots"], message: "Profile screenshots belong to social platforms." });
}).transform((entry) => ({ ...entry, other_name: entry.platform === "Other" ? entry.other_name ?? null : null })))
  .max(ONLINE_PLATFORMS.length)
  .refine((entries) => new Set(entries.map((entry) => entry.platform)).size === entries.length, "Each platform can only be selected once")
  .default([]);

export function hasAdHistory(answer: string) {
  return answer === AD_OPTIONS[0] || answer === AD_OPTIONS[1] || answer === "Used to";
}

const s = (max: number) => z.string().trim().max(max);
const o = (max: number) => s(max).nullish().transform((v) => v || null);

export const auditSchema = z.object({
  name: s(100).min(1, "Please enter your name"),
  business_name: s(150).min(1, "Please enter your business name"),
  email: s(255).email("Enter a valid email"),
  whatsapp: internationalPhoneSchema,
  industry_location: s(200).min(1, "Tell us your industry and location"),
  online_links: onlineLinksSchema,
  challenge: z.enum(["Few customers", "Low sales", "No online presence", "Weak branding", "Other"]),
  goals: z.array(z.enum(AUDIT_GOALS)).max(AUDIT_GOALS.length).default([]),
  goals_other: o(500),
  running_ads: z.enum(AD_OPTIONS),
  ad_platforms: z.array(z.enum(AD_PLATFORMS)).max(AD_PLATFORMS.length).default([]),
  ad_platform_other: o(500),
  ad_spend: o(100),
  report_preference: z.enum(["WhatsApp", "Email"]),
  screenshot: z.object({ name: s(200), type: s(100), base64: z.string().max(7_000_000) }).optional(),
}).superRefine((data, ctx) => {
  if (data.goals.includes("Other") && !data.goals_other)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["goals_other"], message: "Please describe your other goal" });
  if (hasAdHistory(data.running_ads) && data.ad_platforms.includes("Other") && !data.ad_platform_other)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ad_platform_other"], message: "Please enter your other ad platform" });
}).transform((data) => ({
  ...data,
  goals: [...new Set(data.goals)],
  goals_other: data.goals.includes("Other") ? data.goals_other : null,
  ad_platforms: hasAdHistory(data.running_ads) ? [...new Set(data.ad_platforms)] : [],
  ad_platform_other: hasAdHistory(data.running_ads) && data.ad_platforms.includes("Other") ? data.ad_platform_other : null,
  ad_spend: hasAdHistory(data.running_ads) ? data.ad_spend : null,
  screenshot: hasAdHistory(data.running_ads) ? data.screenshot : undefined,
}));