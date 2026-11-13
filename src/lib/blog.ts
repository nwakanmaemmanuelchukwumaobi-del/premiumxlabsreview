import articleText from "@/content/google-business-nigeria.md?raw";

export type ArticleBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

export function parseArticle(text: string): ArticleBlock[] {
  return text.trim().split(/\n\s*\n/).map((part): ArticleBlock => {
    const heading = /^(#{1,3}) (.+)$/.exec(part);
    if (heading) {
      const level = heading[1].length;
      if (level === 1 || level === 2 || level === 3) return { kind: "heading", level, text: heading[2] };
    }
    if (part.startsWith("- ")) return { kind: "list", items: part.split("\n").map(line => line.replace(/^- /, "")) };
    return { kind: "paragraph", text: part };
  });
}

export const googleBusinessPost = {
  path: "/blog/how-to-make-my-business-visible-on-google-in-nigeria" as const,
  title: "How to Make My Business Visible on Google in Nigeria for Free",
  description: "Learn how to make your business visible on Google in Nigeria for free. Set up Google Business Profile and show up on Google Maps step by step.",
  excerpt: "You have a good business, but when a customer types what you sell into Google, your name doesn't appear. That customer doesn't wait. They call the next business on the list.",
  author: "premiumxlabs",
  published: "2026-11-13",
  dateLabel: "13 November 2026",
  category: "Google & Local SEO",
  blocks: parseArticle(articleText),
};

export const blogPosts = [googleBusinessPost];

export function articleFAQs(blocks: ArticleBlock[]) {
  const questions: { question: string; answer: string }[] = [];
  let inFAQ = false;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.kind === "heading" && block.level === 2) inFAQ = block.text === "Frequently Asked Questions";
    if (inFAQ && block.kind === "heading" && block.level === 3) {
      const next = blocks[i + 1];
      if (next?.kind === "paragraph") questions.push({ question: block.text, answer: next.text });
    }
  }
  return questions;
}

export const checkupLabel = "Get your free digital check-up from premiumxlabs today.";

export function articleStructuredData() {
  const url = `https://premiumxlabs.com${googleBusinessPost.path}`;
  return [
    {
      "@context": "https://schema.org", "@type": "Article",
      headline: googleBusinessPost.title,
      description: googleBusinessPost.description,
      author: { "@type": "Organization", name: googleBusinessPost.author },
      datePublished: googleBusinessPost.published,
      publisher: { "@type": "Organization", name: "premiumxlabs" },
      mainEntityOfPage: url,
      articleSection: googleBusinessPost.category,
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: articleFAQs(googleBusinessPost.blocks).map(faq => ({
        "@type": "Question", name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://premiumxlabs.com/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://premiumxlabs.com/blog" },
        { "@type": "ListItem", position: 3, name: googleBusinessPost.title, item: url },
      ],
    },
  ];
}