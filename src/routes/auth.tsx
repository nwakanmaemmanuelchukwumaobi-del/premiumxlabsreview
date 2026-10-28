import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/auth")({ staticData: { sitemap: false }, head: () => ({ meta: [
  { title: "Private Owner Sign-in | premiumxlabs" }, { name: "description", content: "Secure owner sign-in for premiumxlabs audit submissions." },
  { property: "og:title", content: "Private Owner Sign-in | premiumxlabs" }, { property: "og:description", content: "Secure owner access to premiumxlabs audits." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex,nofollow" },
] }), component: AuthPage });
function AuthPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => { if (data.user) void navigate({ to: "/admin" }); }); }, [navigate]);
  async function emailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithOtp({ email: String(fd.get("email")), options: { emailRedirectTo: `${window.location.origin}/auth` } });
    setMessage(error ? error.message : "Check your email for your secure sign-in link."); setBusy(false);
  }
  async function social(provider: "google" | "lovable") {
    setBusy(true); setMessage("");
    try { const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
      if (result.error) setMessage(result.error.message); else { const { data } = await supabase.auth.getUser(); if (data.user) await navigate({ to: "/admin" }); }
    } catch { setMessage("Sign-in couldn't complete. Please try again."); } finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-md px-6 py-16"><h1 className="text-3xl font-bold">Owner sign-in</h1>
    <div className="mt-8 grid gap-3"><Button disabled={busy} onClick={() => social("google")}>Continue with Google</Button><Button variant="outline" disabled={busy} onClick={() => social("lovable")}>Sign in with Lovable</Button></div>
    <form onSubmit={emailLogin} className="mt-8 space-y-4"><label className="block text-sm font-medium" htmlFor="owner-email">Email</label><input id="owner-email" name="email" type="email" required className="field" autoComplete="email" /><Button type="submit" disabled={busy} className="w-full">Send sign-in link</Button></form>
    {message && <p role="status" className="mt-4 text-sm">{message}</p>}</section>;
}