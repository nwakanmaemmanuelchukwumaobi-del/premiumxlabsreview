import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { sitemapStaticPaths, sitemapXML } from "@/lib/sitemap";

describe("Public sitemap", () => {
  it("includes the six public pages and excludes the sitemap endpoint", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(sitemapStaticPaths(router)).toEqual(["/", "/about", "/audit", "/contact", "/services", "/web-design-abuja"]);
  });
  it("uses the public origin without fabricated lastmod dates", () => {
    const xml = sitemapXML("https://premiumxlabsreview.lovable.app", [{ path: "/" }, { path: "/audit" }]);
    expect(xml).toContain("<loc>https://premiumxlabsreview.lovable.app/audit</loc>");
    expect(xml).not.toContain("<lastmod>");
  });
  it("rejects external paths", () => {
    expect(() => sitemapXML("https://premiumxlabsreview.lovable.app", [{ path: "//external.example/page" }])).toThrow("Invalid sitemap path");
  });
});