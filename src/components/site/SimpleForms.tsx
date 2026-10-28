import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { serviceSchema, submitService, contactSchema, submitContact } from "@/lib/forms.functions";
import { ALL_SERVICES } from "@/lib/site";
import { SUBMISSION_ERROR } from "@/lib/submission-errors";

const L = "mb-1.5 block text-sm font-medium";

function useSubmit<T>(schema: { safeParse: (d: unknown) => any }, fn: (a: { data: T }) => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const raw = Object.fromEntries(
      [...new FormData(e.currentTarget).entries()].map(([k, v]) => [k, String(v).trim() || undefined]),
    );
    const p = schema.safeParse(raw);
    if (!p.success) return setError(p.error.issues[0]?.message ?? "Please check the form.");
    setBusy(true);
    try { await fn({ data: p.data }); setDone(true); }
    catch { setError(SUBMISSION_ERROR); }
    finally { setBusy(false); }
  }
  return { busy, error, done, onSubmit };
}

function Done({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-8 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-cta" />
      <p className="mt-3 font-semibold">{text}</p>
    </div>
  );
}

function Submit({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy px-6 py-3.5 font-semibold text-navy-foreground transition hover:bg-steel disabled:opacity-60">
      {busy && <Loader2 className="h-4 w-4 animate-spin" />} {label}
    </button>
  );
}

export function ServiceRequestForm({ preset }: { preset?: string | undefined }) {
  const { busy, error, done, onSubmit } = useSubmit(serviceSchema, useServerFn(submitService));
  if (done) return <Done text="Thanks! We've received your request and will reach out shortly." />;
  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={L}>Name</label><input name="name" className="field" required /></div>
        <div><label className={L}>Business name</label><input name="business_name" className="field" /></div>
        <div className="sm:col-span-2"><label className={L}>WhatsApp or email</label><input name="contact" className="field" required /></div>
        <div className="sm:col-span-2">
          <label className={L}>Which service?</label>
          <select key={preset} name="service" className="field" required defaultValue={preset ?? ""}>
            <option value="" disabled>Select a service</option>
            {ALL_SERVICES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2"><label className={L}>What do you need?</label><textarea name="description" rows={4} className="field" required /></div>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <Submit busy={busy} label="Request This Service" />
    </form>
  );
}

export function ContactForm() {
  const { busy, error, done, onSubmit } = useSubmit(contactSchema, useServerFn(submitContact));
  if (done) return <Done text="Message sent. We'll get back to you soon." />;
  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={L}>Name</label><input name="name" className="field" required /></div>
        <div><label className={L}>Email</label><input name="email" type="email" className="field" required /></div>
        <div className="sm:col-span-2"><label className={L}>Phone (optional)</label><input name="phone" type="tel" className="field" /></div>
        <div className="sm:col-span-2"><label className={L}>Message</label><textarea name="message" rows={5} className="field" required /></div>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <Submit busy={busy} label="Send Message" />
    </form>
  );
}
