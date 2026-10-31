import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { z } from "zod";

export { getCountries, getCountryCallingCode, type CountryCode };
export function internationalPhone(number: string, country: CountryCode = "NG") {
  const national = number.replace(/[\s()-]/g, "").replace(/^0+/, "");
  const parsed = parsePhoneNumberFromString(national, country);
  if (!parsed?.isPossible()) throw new Error("Enter a valid WhatsApp number; it is empty or too short.");
  return parsed.number;
}
export const internationalPhoneSchema = z.string().trim().max(30).transform((value, ctx) => {
  try { return internationalPhone(value); } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid WhatsApp number; it is empty or too short." });
    return z.NEVER;
  }
});