import { Clock3, FileText, Globe2, Loader2, MapPin, MessageCircle, Megaphone, Palette, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Breakdown } from "@/lib/instant-breakdown";

const RESULTS_WHATSAPP = "https://wa.me/2349034340796?text=" + encodeURIComponent("Hi premiumxlabs, I just got my instant website breakdown and I'd like to talk about my results.");
function findingTitle(text: string) {
  if (text.startsWith("We couldn't reach")) return "Let's check the address";
  if (/without a website/i.test(text)) return "An online home for your business";
  if (/didn't find a clear problem|didn't find a clear problem|didn't find a.*problem/i.test(text)) return "A promising first look";
  if (/slow|load|seconds|first content/i.test(text)) return "Your first impression";
  if (/secure|security|encrypted/i.test(text)) return "Customer confidence";
  if (/social profile|social link|social media/i.test(text)) return "Your social connections";
  if (/contact|next step|button/i.test(text)) return "Make the next step clear";
  if (/heading|headline/i.test(text)) return "Your opening message";
  if (/description|summary|search results/i.test(text)) return "Your search introduction";
  if (/title/i.test(text)) return "Your page's introduction";
  return "An opportunity to improve";
}
export function InstantReport({ open, onOpenChange, busy, breakdown, client, website, error }: {
  open: boolean; onOpenChange: (open: boolean) => void; busy: boolean; breakdown: Breakdown | null;
  client: { name: string; biz: string; pref: string } | null; website: string | null; error: string;
}) {
  const firstName = client?.name.trim().split(/\s+/)[0] || "there";
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="instant-report w-[calc(100%-1.5rem)] max-w-2xl max-h-[calc(100dvh-1.5rem)] gap-0 overflow-y-auto rounded-3xl border-report-foreground/15 bg-report p-0 text-report-foreground sm:p-0 motion-reduce:animate-none">
      <div className="px-5 pb-6 pt-10 sm:px-10 sm:pb-10 sm:pt-12">
        <p className="pr-6 text-xs font-bold uppercase tracking-widest text-report-accent">YOUR INSTANT WEBSITE BREAKDOWN</p>
        <DialogTitle className="mt-4 text-2xl leading-tight sm:text-3xl">{busy ? "Analyzing your website..." : breakdown ? `Here's what we found, ${firstName}` : error ? "We couldn't submit your request" : `Thank you, ${client?.name ?? firstName}.`}</DialogTitle>
        <DialogDescription className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-report-muted"><Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-report-accent" /><span className="min-w-0 break-words">{website ? <>Website: {website}</> : "No website provided"}</span></DialogDescription>
        {busy ? <div role="status" className="flex min-h-56 flex-col items-center justify-center gap-5 py-12"><Loader2 className="h-10 w-10 animate-spin text-report-accent motion-reduce:animate-none" /><p className="text-center text-sm text-report-muted">Taking a closer look at your website.</p></div> : error ? <p role="alert" className="mt-8 text-report-foreground">{error}</p> : <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">
          {breakdown ? <ol className="mb-8 mt-8 space-y-6">{breakdown.problems.map((problem, i) => <li key={i} className="flex gap-3 sm:gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-report-accent/40 bg-report-accent/10 text-sm font-bold text-report-accent">{i+1}</span><div className="min-w-0"><h3 className="text-base font-bold leading-snug">{findingTitle(problem)}</h3><p className="mt-2 text-sm leading-relaxed text-report-muted">{problem}</p></div></li>)}</ol> : <div className="my-8 flex items-start gap-3"><CheckCircle2 className="h-6 w-6 shrink-0 text-report-accent" /><p className="text-sm leading-relaxed text-report-muted">Your audit request has been received. Our team will review <strong className="text-report-foreground">{client?.biz}</strong> and send your full report via <strong className="text-report-foreground">{client?.pref}</strong> within 24 hours.</p></div>}
          <div className="border-l-2 border-report-accent bg-report-accent/5 px-4 py-5 sm:px-5">
            <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-report-accent"><FileText className="h-4 w-4" />THIS IS JUST THE START</p>
            <p className="mt-3 text-lg font-bold leading-snug">This was a quick look at your website only.</p>
            <div className="my-5 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">{[{icon:MapPin,label:"Google Presence"},{icon:MessageCircle,label:"Social Media"},{icon:Palette,label:"Branding"},{icon:Megaphone,label:"Ads & Marketing"}].map(({icon:Icon,label}) => <div key={label} className="flex items-start gap-2 sm:flex-col"><Icon className="h-4 w-4 shrink-0 text-report-accent" /><span className="text-xs font-bold leading-snug">{label}</span></div>)}</div>
            <p className="flex items-start gap-2 text-sm font-bold leading-relaxed"><Clock3 className="mt-1 h-4 w-4 shrink-0 text-report-accent" />Our team is preparing your full audit with clear recommendations. We'll send it to you on WhatsApp within 24 hours.</p>
          </div>
          <Button asChild className="mt-7 h-auto w-full gap-2 whitespace-normal rounded-xl bg-report-accent px-4 py-4 text-sm font-bold leading-snug text-report-accent-foreground hover:bg-report-accent/90"><a href={RESULTS_WHATSAPP} target="_blank" rel="noreferrer"><MessageCircle className="shrink-0" /><span>Chat with us on WhatsApp about your results</span><ArrowUpRight className="shrink-0" /></a></Button>
          <p className="mt-3 text-center text-xs text-report-muted">Questions? We reply fast.</p>
        </div>}
      </div>
    </DialogContent>
  </Dialog>;
}