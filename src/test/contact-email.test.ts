import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL } from "@/lib/site";

describe("Public contact email", () => {
  it("uses the requested Gmail address", () => {
    expect(CONTACT_EMAIL).toBe("premuimxlabs@gmail.com");
  });
});