import { createFileRoute } from "@tanstack/react-router";
import { BlogArticle } from "@/components/site/BlogArticle";
import { articleStructuredData, googleBusinessPost as post } from "@/lib/blog";

export const Route = createFileRoute("/blog/how-to-make-my-business-visible-on-google-in-nigeria")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: post.title }, { name: "description", content: post.description },
      { property: "og:title", content: post.title }, { property: "og:description", content: post.description },
      { property: "og:type", content: "article" }, { property: "og:url", content: `https://premiumxlabs.com${post.path}` },
      { property: "article:published_time", content: post.published }, { property: "article:author", content: post.author },
      { property: "article:section", content: post.category },
      { name: "twitter:card", content: "summary" }, { name: "twitter:title", content: post.title }, { name: "twitter:description", content: post.description },
    ],
    links: [{ rel: "canonical", href: `https://premiumxlabs.com${post.path}` }],
    scripts: articleStructuredData().map(schema => ({ type: "application/ld+json", children: JSON.stringify(schema) })),
  }),
  component: BlogArticle,
});