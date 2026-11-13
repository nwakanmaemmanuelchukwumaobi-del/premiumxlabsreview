import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blogPosts } from "@/lib/blog";

const title = "Blog: Google Visibility & Business Growth | premiumxlabs";
const description = "Practical guides from premiumxlabs to help Nigerian businesses get found on Google and grow their online presence.";

export const Route = createFileRoute("/blog/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "website" }, { property: "og:url", content: "https://premiumxlabs.com/blog" },
      { name: "twitter:card", content: "summary" }, { name: "twitter:title", content: title }, { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: "https://premiumxlabs.com/blog" }],
  }),
  component: Blog,
});

function Blog() {
  return <>
    <section className="bg-soft px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl"><p className="text-sm font-semibold text-cta">premiumxlabs</p><h1 className="mt-3 text-4xl font-extrabold text-navy">Blog</h1></div>
    </section>
    <section className="mx-auto grid max-w-6xl gap-6 px-5 py-12 md:grid-cols-2 lg:grid-cols-3">
      {blogPosts.map(post => <article key={post.path} className="flex flex-col rounded-lg border border-border bg-card p-6 text-card-foreground">
        <p className="text-sm font-semibold text-cta">{post.category}</p>
        <h2 className="mt-4 text-xl font-bold leading-snug"><Link to={post.path} className="hover:text-cta">{post.title}</Link></h2>
        <time dateTime={post.published} className="mt-3 text-sm text-muted-foreground">{post.dateLabel}</time>
        <p className="mb-5 mt-4 text-base leading-relaxed text-muted-foreground">{post.excerpt}</p>
        <Button asChild variant="link" className="mt-auto h-auto justify-start self-start p-0 text-cta"><Link to={post.path}>Read more<ArrowRight /></Link></Button>
      </article>)}
    </section>
  </>;
}