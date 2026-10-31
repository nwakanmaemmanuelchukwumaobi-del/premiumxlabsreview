import { z } from "zod";
export const SCREENSHOT_LIMIT = 5 * 1024 * 1024;
export const SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const profileScreenshotSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(SCREENSHOT_TYPES),
  base64: z.string().min(1).max(Math.ceil(SCREENSHOT_LIMIT / 3) * 4).regex(/^[A-Za-z0-9+/]+={0,2}$/),
}).superRefine((file, ctx) => {
  const size = file.base64.length * 3 / 4 - (file.base64.endsWith("==") ? 2 : file.base64.endsWith("=") ? 1 : 0);
  if (size > SCREENSHOT_LIMIT) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Each screenshot must be no larger than 5 MB." });
});
export type SignedProfileImage = { platform: string; name: string; url: string };
export type StoredProfileImage = { name: string; path: string };
export function storedProfileImages(value: unknown): StoredProfileImage[] {
  return z.array(z.object({ name: z.string(), path: z.string() })).max(3).safeParse(value).data ?? [];
}
export function matchesImageType(bytes: Uint8Array, type: string) {
  if (type === "image/png") return [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return type === "image/webp" && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
}