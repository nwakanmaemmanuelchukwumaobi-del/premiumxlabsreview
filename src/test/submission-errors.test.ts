import { describe, expect, it, vi } from "vitest";
import { withSafeSubmission } from "@/lib/submission-errors";

describe("Visitor-safe submission failures", () => {
  it("rejects upstream failures without leaking their details or reporting success", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const submit = vi.fn().mockRejectedValue(new Error("internal configuration failure"));
    try {
      await expect(withSafeSubmission(submit)).rejects.not.toThrow("internal configuration failure");
      expect(submit).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(log.mock.calls)).not.toContain("internal configuration failure");
    } finally {
      log.mockRestore();
    }
  });

  it("returns the saved result unchanged on success", async () => {
    const saved = { ok: true, id: "saved-audit" };
    await expect(withSafeSubmission(async () => saved)).resolves.toBe(saved);
  });
});