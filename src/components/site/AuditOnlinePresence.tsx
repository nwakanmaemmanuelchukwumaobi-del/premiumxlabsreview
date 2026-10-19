import { useId } from "react";
import { AuditChips } from "@/components/site/AuditChips";
import { ONLINE_FIELDS, ONLINE_PLATFORMS } from "@/lib/audit-fields";

export function AuditOnlinePresence({ selected, onChange }: { selected: string[]; onChange: (selected: string[]) => void }) {
  const id = useId();
  return (
    <AuditChips label="Where can we find your business online?" options={ONLINE_PLATFORMS} value={selected} onChange={onChange}>
      {selected.length > 0 && (
        <div className="mt-4 grid gap-3">
          {ONLINE_PLATFORMS.filter((platform) => selected.includes(platform)).map((platform) => {
            const field = ONLINE_FIELDS[platform];
            const fieldId = `${id}-${platform}`;
            return (
              <div key={platform} className="min-w-0 animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none">
                {platform === "Other" && (
                  <div className="mb-3">
                    <label htmlFor={`${id}-other-name`} className="mb-1.5 block text-sm font-medium">Other platform name</label>
                    <input id={`${id}-other-name`} name="online_other_name" className="field" placeholder="e.g. Pinterest" maxLength={150} required />
                  </div>
                )}
                <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium">{field.label}</label>
                <input id={fieldId} name={`online_link_${platform}`} className="field" placeholder={field.placeholder} maxLength={1000} required autoCapitalize="none" autoCorrect="off" spellCheck={false} />
              </div>
            );
          })}
        </div>
      )}
    </AuditChips>
  );
}