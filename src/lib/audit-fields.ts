import { z } from "zod";

export const AD_OPTIONS = ["Yes and getting results", "Yes but not getting results", "No, never", "Used to"] as const;
export const AD_PLATFORMS = ["Facebook / Instagram (Meta)", "Google Ads", "TikTok", "YouTube", "Snapchat", "X (Twitter)", "LinkedIn", "Influencer or promoted posts", "Other"] as const;
export const AUDIT_GOALS = ["Generate more leads", "Increase sales", "Get more website visitors", "Build brand awareness", "Get more followers and engagement", "Get more calls or WhatsApp enquiries", "Get more foot traffic to my location", "Launch a new product or business", "Improve my online reputation", "Make my ads perform better", "Other"] as const;

export function hasAdHistory(answer: string) {
  return answer === AD_OPTIONS[0] || answer === AD_OPTIONS[1] || answer === "Used to";
}

const s = (max: number) => z.string().trim().max(max);
const o = (max: number) => s(max).optional().transform((v) => v || null);

export const auditSchema = z.object({
  name: s(100).min(1, "Please enter your name"),
  business_name: s(150).min(1, "Please enter your business name"),
  email: s(255).email("Enter a valid email"),
  whatsapp: s(30).min(7, "Enter a valid WhatsApp number"),
  industry_location: s(200).min(1, "Tell us your industry and location"),
  links: o(1000),
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