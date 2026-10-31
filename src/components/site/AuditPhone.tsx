import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCountries, getCountryCallingCode, type CountryCode } from "@/lib/audit-phone";
const flag = (code: string) => [...code].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join("");
export function AuditPhone() {
  const [country, setCountry] = useState<CountryCode>("NG");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return getCountries().map(code => ({ code, name: names.of(code) ?? code, dial: getCountryCallingCode(code) })).sort((a,b) => a.name.localeCompare(b.name));
  }, []);
  return <div><label htmlFor="audit-phone" className="mb-1.5 block text-sm font-medium">WhatsApp number</label>
    <input type="hidden" name="phone_country" value={country} />
    <div className="relative grid grid-cols-[auto_minmax(0,1fr)] gap-2">
      <Button type="button" variant="outline" aria-label="Country dial code" aria-expanded={open} onClick={() => setOpen(!open)} className="h-auto rounded-xl px-3">{flag(country)} +{getCountryCallingCode(country)}<ChevronDown /></Button>
      <input id="audit-phone" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel-national" className="field min-w-0" placeholder="9034340796" maxLength={25} />
      {open && <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-xl border border-border bg-card p-2 shadow-xl"><input aria-label="Search countries" className="field mb-2" placeholder="Search country or dial code" value={search} onChange={e => setSearch(e.target.value)} /><div className="max-h-52 overflow-y-auto">{countries.filter(c => `${c.name} ${c.code} +${c.dial}`.toLowerCase().includes(search.toLowerCase())).map(c => <Button type="button" variant="ghost" key={c.code} className="h-auto w-full justify-start whitespace-normal py-2 text-left" onClick={() => { setCountry(c.code); setOpen(false); setSearch(""); }}>{flag(c.code)} {c.name} +{c.dial}</Button>)}</div></div>}
    </div></div>;
}