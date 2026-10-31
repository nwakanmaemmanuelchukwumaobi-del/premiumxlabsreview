import { QueryClient } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { sitemapPublicOrigin, sitemapStaticPaths, sitemapXML } from "@/lib/sitemap";

describe("Public sitemap", () => {
  it("includes the six public pages and excludes the sitemap endpoint", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(sitemapStaticPaths(router)).toEqual(["/", "/about", "/audit", "/contact", "/services", "/web-design-abuja"]);
  });
  it("uses the public origin without fabricated lastmod dates", () => {
    expect(sitemapPublicOrigin).toBe("https://premiumxlabs.com");
    const xml = sitemapXML(sitemapPublicOrigin, [{ path: "/" }, { path: "/audit" }]);
    expect(xml).toContain("<loc>https://premiumxlabs.com/audit</loc>");
    expect(xml).not.toContain("<lastmod>");
  });
  it("directs crawlers to the custom-domain sitemap", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    expect(robots).toContain("Sitemap: https://premiumxlabs.com/sitemap.xml");
    expect(robots).not.toContain("premiumxlabsreview.lovable.app");
  });
  it("rejects external paths", () => {
    expect(() => sitemapXML(sitemapPublicOrigin, [{ path: "//external.example/page" }])).toThrow("Invalid sitemap path");
  });
});