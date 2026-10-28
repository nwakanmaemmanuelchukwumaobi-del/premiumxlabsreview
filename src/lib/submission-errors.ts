export const SUBMISSION_ERROR = "Something went wrong. Please try again, or message us on WhatsApp.";

/** Retain server diagnostics, but never return infrastructure errors to visitors. */
export async function withSafeSubmission<T>(submit: () => Promise<T>): Promise<T> {
  try {
    return await submit();
  } catch {
    // Do not log submitted answers or credentials from upstream error objects.
    console.error("Form submission failed; no success confirmation was returned.");
    throw new Error(SUBMISSION_ERROR);
  }
}