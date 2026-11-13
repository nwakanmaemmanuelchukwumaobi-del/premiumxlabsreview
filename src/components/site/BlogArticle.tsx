import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkupLabel, googleBusinessPost as post } from "@/lib/blog";

function InlineText({ text }: { text: string }) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      : <Fragment key={index}>{part}</Fragment>,
  );
}

function CheckupButton({ small = false }: { small?: boolean }) {
  return (
    <Button asChild className={`h-auto max-w-full gap-3 whitespace-normal rounded-full bg-cta text-center text-cta-foreground hover:bg-cta/90 ${small ? "px-5 py-3 text-sm" : "px-6 py-4 text-base"}`}>
      <Link to="/audit">{checkupLabel}<ArrowRight className="shrink-0" /></Link>
    </Button>
  );
}

export function BlogArticle() {
  return (
    <article className="mx-auto max-w-[748px] px-5 pb-20 pt-8 sm:px-6 sm:pt-12">
      <nav aria-label="Breadcrumb" className="mb-9 text-sm leading-relaxed text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link to="/" className="hover:text-cta">Home</Link></li>
          <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
          <li><Link to="/blog" className="hover:text-cta">Blog</Link></li>
          <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
          <li aria-current="page" className="basis-full sm:basis-auto">{post.title}</li>
        </ol>
      </nav>
      <header className="mb-8 border-b border-border pb-8">
        <p className="mb-4 text-sm font-semibold text-cta">{post.category}</p>
        <h1 className="text-3xl font-extrabold leading-tight tracking-normal text-navy sm:text-4xl">{post.title}</h1>
        <p className="mt-5 text-base text-muted-foreground">By {post.author} <span aria-hidden="true">·</span> <time dateTime={post.published}>{post.dateLabel}</time></p>
      </header>
      <div className="space-y-5 text-[17px] leading-[1.85] text-foreground">
        {post.blocks.map((block, index) => {
          if (block.kind === "heading") {
            if (block.level === 1) return null;
            if (block.level === 2) return <h2 key={index} className="pt-7 text-2xl font-bold leading-snug tracking-normal text-navy">{block.text}</h2>;
            return <h3 key={index} className="pt-3 text-lg font-bold leading-relaxed tracking-normal text-navy">{block.text}</h3>;
          }
          if (block.kind === "list") return <ul key={index} className="list-disc space-y-3 pl-6 marker:text-steel">{block.items.map(item => <li key={item}><InlineText text={item} /></li>)}</ul>;
          if (block.text === "By premiumxlabs") return null;
          if (block.text === `**${checkupLabel}**`) return <div key={index} className="pt-3"><CheckupButton /></div>;
          const next = post.blocks[index + 1];
          const afterGoBeyond = next?.kind === "heading" && next.text === "Frequently Asked Questions";
          return <Fragment key={index}><p><InlineText text={block.text} /></p>{afterGoBeyond && <div className="py-3"><CheckupButton small /></div>}</Fragment>;
        })}
      </div>
    </article>
  );
}