import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, MessageCircle, Mail, MapPin, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png.asset.json";
import { WHATSAPP_URL, CONTACT_EMAIL, LOCATION } from "@/lib/site";

export function AuditButton({ className = "", label = "Get My Free Audit" }: { className?: string; label?: string }) {
  return (
    <Link
      to="/audit"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-cta px-5 py-3 text-sm font-semibold text-cta-foreground shadow-lg shadow-cta/25 transition hover:brightness-110 ${className}`}
    >
      {label} <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img src={logo.url} alt="premiumxlabs logo" className="h-9 w-9 rounded-lg" />
      <span className={`font-display text-lg font-extrabold tracking-tight ${light ? "text-navy-foreground" : "text-navy"}`}>
        premiumxlabs
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm font-medium text-muted-foreground hover:text-navy" activeProps={{ className: "text-navy" }} activeOptions={{ exact: true }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <AuditButton className="hidden px-4 py-2 sm:inline-flex" />
          <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border bg-background px-4 py-3 md:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block py-2 font-medium">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy pb-24 text-navy-foreground md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm text-navy-foreground/70">
            Marketing and digital solutions for businesses of every size.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-navy-foreground/60">Pages</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.to}><Link to={n.to} className="hover:underline">{n.label}</Link></li>
            ))}
            <li><Link to="/audit" className="font-semibold hover:underline">Free Business Audit</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-navy-foreground/60">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline"><MessageCircle className="h-4 w-4" /> +234 903 434 0796</a></li>
            <li><a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 hover:underline"><Mail className="h-4 w-4" /> {CONTACT_EMAIL}</a></li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {LOCATION}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-foreground/10 py-5 text-center text-xs text-navy-foreground/50">
        © {new Date().getFullYear()} premiumxlabs. All rights reserved.
      </div>
    </footer>
  );
}

export function WhatsAppFloat({ raised = true }: { raised?: boolean }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className={`fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-navy-foreground shadow-xl transition hover:scale-105 md:bottom-6 ${raised ? "bottom-24" : "bottom-6"}`}
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}

export function MobileAuditBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
      <AuditButton className="w-full" />
    </div>
  );
}
