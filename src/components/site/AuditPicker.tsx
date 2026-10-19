import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";

/**
 * Shared collapsed "box" for the audit form: a rounded box with a chevron
 * that opens a dropdown panel (bottom sheet on mobile, anchored panel on
 * desktop). Children render inside the box, above the chevron row.
 */
function PickerBox({
  label,
  open,
  onToggle,
  onClose,
  children,
  panel,
  empty,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children?: ReactNode;
  panel: ReactNode;
  empty: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="relative min-w-0 sm:col-span-2">
      <div
        className={`rounded-2xl border bg-card transition-colors ${open ? "border-cta shadow-lg shadow-cta/10" : "border-steel/25"}`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left"
        >
          <span className={`text-sm font-medium ${empty ? "text-muted-foreground" : "text-navy"}`}>{label}</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-steel transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {children && <div className="px-4 pb-4">{children}</div>}
      </div>

      {open && (
        <>
          {/* mobile bottom sheet */}
          <div className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm sm:hidden" onClick={onClose} aria-hidden="true" />
          <div
            role="dialog"
            aria-label={label}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-3 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:z-30 sm:mt-2 sm:max-h-72 sm:w-full sm:rounded-2xl sm:slide-in-from-bottom-0 sm:slide-in-from-top-2"
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden="true" />
            {panel}
          </div>
        </>
      )}
    </div>
  );
}

function OptionRow({
  option,
  selected,
  onPick,
}: {
  option: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onPick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition-colors ${
        selected ? "bg-accent font-semibold text-navy" : "text-foreground hover:bg-accent"
      }`}
    >
      {option}
      {selected && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-cta" />}
    </button>
  );
}

function RemovableChips({ values, onRemove }: { values: string[]; onRemove: (v: string) => void }) {
  if (values.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-steel bg-steel px-3 py-1.5 text-xs font-semibold leading-snug text-navy-foreground"
        >
          <span className="break-words">{v}</span>
          <button
            type="button"
            aria-label={`Remove ${v}`}
            onClick={() => onRemove(v)}
            className="rounded-full p-0.5 transition hover:bg-navy-foreground/20"
          >
            <X aria-hidden="true" className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

/** Multi-select box (goals, ad platforms): chips live inside the box; dropdown toggles options. */
export function MultiPicker({
  label,
  options,
  value,
  onChange,
  otherName,
  otherLabel,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  otherName?: string;
  otherLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (option: string) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);

  return (
    <PickerBox
      label={value.length > 0 ? `${label} (${value.length} selected)` : label}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      onClose={() => setOpen(false)}
      empty={value.length === 0}
      panel={
        <div className="grid gap-0.5">
          {options.map((option) => (
            <OptionRow key={option} option={option} selected={value.includes(option)} onPick={() => toggle(option)} />
          ))}
        </div>
      }
    >
      {(value.length > 0 || (otherName && value.includes("Other"))) && (
        <div className="grid gap-3 border-t border-border pt-3">
          <RemovableChips values={value} onRemove={(v) => onChange(value.filter((x) => x !== v))} />
          {otherName && value.includes("Other") && (
            <div>
              <label htmlFor={otherName} className="mb-1.5 block text-sm font-medium">
                {otherLabel}
              </label>
              <input id={otherName} name={otherName} className="field" maxLength={500} required />
            </div>
          )}
        </div>
      )}
    </PickerBox>
  );
}

export type OnlineEntry = { platform: string; key: number };

/** Online presence: box opens a list of platforms; each pick adds a labeled input with a remove button. */
export function OnlinePresencePicker({
  entries,
  onChange,
  fields,
  platforms,
}: {
  entries: OnlineEntry[];
  onChange: (entries: OnlineEntry[]) => void;
  fields: Record<string, { label: string; placeholder: string }>;
  platforms: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const nextKey = useRef(1);
  const chosen = entries.map((e) => e.platform);
  const remaining = platforms.filter((p) => !chosen.includes(p));

  const add = (platform: string) => {
    onChange([...entries, { platform, key: nextKey.current++ }]);
    if (remaining.length <= 1) setOpen(false);
  };

  return (
    <PickerBox
      label={entries.length > 0 ? "Add your website or social media" : "Add your website or social media"}
      open={open}
      onToggle={() => remaining.length > 0 && setOpen((o) => !o)}
      onClose={() => setOpen(false)}
      empty={entries.length === 0}
      panel={
        <div className="grid gap-0.5">
          {remaining.map((option) => (
            <OptionRow key={option} option={option} selected={false} onPick={() => add(option)} />
          ))}
        </div>
      }
    >
      {entries.length > 0 && (
        <div className="grid gap-3 border-t border-border pt-3">
          {entries.map(({ platform, key }) => {
            const field = fields[platform];
            if (!field) return null;
            return (
              <div
                key={key}
                className="animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none"
              >
                {platform === "Other" && (
                  <div className="mb-3">
                    <label htmlFor={`online-other-name-${key}`} className="mb-1.5 block text-sm font-medium">
                      Other platform name
                    </label>
                    <input
                      id={`online-other-name-${key}`}
                      name="online_other_name"
                      className="field"
                      placeholder="e.g. Pinterest"
                      maxLength={150}
                      required
                    />
                  </div>
                )}
                <label htmlFor={`online-link-${key}`} className="mb-1.5 block text-sm font-medium">
                  {field.label}
                </label>
                <div className="flex items-start gap-2">
                  <input
                    id={`online-link-${key}`}
                    name={`online_link_${platform}`}
                    className="field min-w-0 flex-1"
                    placeholder={field.placeholder}
                    maxLength={1000}
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${platform}`}
                    onClick={() => onChange(entries.filter((e) => e.key !== key))}
                    className="mt-1 rounded-full border border-steel/25 p-2 text-steel transition hover:border-destructive hover:text-destructive"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {remaining.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 self-start rounded-full border border-steel/25 px-3.5 py-2 text-sm font-semibold text-steel transition hover:border-cta hover:text-cta"
            >
              <Plus aria-hidden="true" className="h-4 w-4" /> Add another
            </button>
          )}
        </div>
      )}
    </PickerBox>
  );
}
