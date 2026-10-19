import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function AuditChips({ label, options, value, onChange, otherName, otherLabel, children }: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  otherName?: string;
  otherLabel?: string;
  children?: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 sm:col-span-2">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <Button key={option} type="button" role="checkbox" aria-checked={selected} variant="outline"
              onClick={() => onChange(selected ? value.filter((v) => v !== option) : [...value, option])}
              className={`h-auto min-h-11 max-w-full whitespace-normal rounded-full px-3 py-2 text-left text-sm leading-snug shadow-none ${selected ? "border-steel bg-steel text-navy-foreground hover:bg-steel/90 hover:text-navy-foreground" : "border-steel/25 text-steel hover:border-steel hover:bg-accent"}`}>
              {selected && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}{option}
            </Button>
          );
        })}
      </div>
      {children}
      {otherName && value.includes("Other") && (
        <div className="mt-3">
          <label htmlFor={otherName} className="mb-1.5 block text-sm font-medium">{otherLabel}</label>
          <input id={otherName} name={otherName} className="field" maxLength={500} required />
        </div>
      )}
    </fieldset>
  );
}