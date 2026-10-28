import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LogOut, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { getAuditSubmissions, saveOwnerProfile } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_authenticated/admin")({ staticData: { sitemap: false }, head: () => ({ meta: [
  { title: "Private Audit Inbox | premiumxlabs" }, { name: "description", content: "Owner-only premiumxlabs audit answers and website breakdowns." },
  { property: "og:title", content: "Private Audit Inbox | premiumxlabs" }, { property: "og:description", content: "Private owner audit inbox." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex,nofollow" },
] }), component: AdminPage });
function AdminPage() {
  const fetchRows = useServerFn(getAuditSubmissions); const saveProfile = useServerFn(saveOwnerProfile);
  const qc = useQueryClient(); const navigate = useNavigate(); const [offset, setOffset] = useState(0); const [selected, setSelected] = useState<string | null>(null); const [profileMessage,setProfileMessage]=useState("");
  const query = useQuery({ queryKey: ["private-audits",offset], queryFn: () => fetchRows({ data: { offset } }), retry: false });
  const row = query.data?.rows.find(r => r.id === selected) ?? query.data?.rows[0];
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }
  return <section className="mx-auto max-w-7xl px-6 py-10"><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold">Audit inbox</h1><Button variant="outline" onClick={signOut}><LogOut />Sign out</Button></div>
    {query.isPending ? <p className="mt-8">Loading audits…</p> : query.error ? <p role="alert" className="mt-8 text-destructive">{query.error.message}</p> : <>
    <form className="my-6 flex flex-wrap items-end gap-3" onSubmit={async e => { e.preventDefault(); const fd=new FormData(e.currentTarget); try { await saveProfile({data:{display_name:String(fd.get("display_name"))}}); setProfileMessage("Name saved."); } catch { setProfileMessage("Could not save your name."); } }}><label className="text-sm">Your display name<input className="field mt-1" name="display_name" maxLength={100} defaultValue={query.data?.displayName} /></label><Button type="submit" variant="outline"><Save />Save</Button><p role="status" className="text-sm">{profileMessage}</p></form>
    <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]"><aside className="min-w-0"><div className="space-y-2">{query.data?.rows.map(r => <Button key={r.id} variant={row?.id===r.id ? "secondary" : "outline"} className="h-auto w-full justify-start whitespace-normal py-3 text-left" onClick={() => setSelected(r.id)}><span className="min-w-0 break-words">{r.business_name}<small className="mt-1 block text-muted-foreground">{r.name} · {new Date(r.created_at).toLocaleDateString()}</small></span></Button>)}</div><div className="mt-4 flex justify-between"><Button title="Previous submissions" aria-label="Previous submissions" variant="outline" size="icon" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-25))}><ChevronLeft /></Button><Button title="Next submissions" aria-label="Next submissions" variant="outline" size="icon" disabled={(query.data?.rows.length??0)<25} onClick={()=>setOffset(offset+25)}><ChevronRight /></Button></div></aside>
    <div className="min-w-0">{row ? <><h2 className="text-2xl font-bold break-words">{row.business_name}</h2><dl className="mt-6 grid gap-4 sm:grid-cols-2">{Object.entries({Name:row.name,Email:row.email,WhatsApp:row.whatsapp,"Industry & location":row.industry_location,Challenge:row.challenge,"Running ads":row.running_ads,"Ad platforms":row.ad_platforms?.join(", "),"Other ad platform":row.ad_platform_other,"Ad spend":row.ad_spend,Goals:row.goals?.join(", "),"Other goal":row.goals_other,"Report preference":row.report_preference}).map(([label,value])=><div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words text-sm">{value||"Not provided"}</dd></div>)}</dl>
    <h3 className="mt-8 font-semibold">Online presence</h3><pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(row.online_links,null,2)}</pre>
    {row.screenshot_url && <a className="mt-4 inline-block text-cta underline" href={row.screenshot_url} target="_blank" rel="noreferrer">View uploaded screenshot</a>}
    <h3 className="mt-8 font-semibold">Instant breakdown shown to client</h3><pre className="mt-2 whitespace-pre-wrap break-words text-sm">{row.instant_breakdown ? JSON.stringify(row.instant_breakdown,null,2) : "No instant breakdown was shown."}</pre>
    <h3 className="mt-8 font-semibold">Saved website check results</h3><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-muted p-4 text-xs">{JSON.stringify(row.website_checks,null,2)}</pre></> : <p>No audit submissions yet.</p>}</div></div></>}
  </section>;
}