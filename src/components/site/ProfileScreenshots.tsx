import { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCREENSHOT_LIMIT, SCREENSHOT_TYPES } from "@/lib/profile-screenshots";
function Thumbnail({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => { const value = URL.createObjectURL(file); setUrl(value); return () => URL.revokeObjectURL(value); }, [file]);
  return <img src={url || undefined} alt="Selected profile screenshot" className="h-16 w-16 rounded-md object-cover" />;
}
export function ProfileScreenshots({ platform, files, onChange }: { platform: string; files: File[]; onChange: (files: File[]) => void }) {
  const [error, setError] = useState("");
  return <div className="mt-3">
    <Button asChild type="button" variant="outline" className="h-auto max-w-full whitespace-normal rounded-xl px-3 py-2 text-left text-xs"><label><Upload /><span>Upload a screenshot of your profile (optional)</span><input type="file" aria-label={`Upload ${platform} profile screenshots`} className="sr-only" multiple accept="image/png,image/jpeg,image/webp" onChange={e => {
      const added = Array.from(e.target.files ?? []); e.target.value = "";
      if (files.length + added.length > 3) return setError("Add up to 3 screenshots per platform.");
      if (added.some(f => !SCREENSHOT_TYPES.some(t => t === f.type))) return setError("Choose PNG, JPG or WebP images.");
      if (added.some(f => f.size > SCREENSHOT_LIMIT)) return setError("Each screenshot must be no larger than 5 MB.");
      setError(""); onChange([...files, ...added]);
    }} /></label></Button>
    <p className="mt-1.5 text-xs text-muted-foreground">Screenshots help us give you a more accurate audit.</p>
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    <div className="mt-2 flex flex-wrap gap-3">{files.map((file,i) => <div key={`${file.name}-${i}`} className="relative"><Thumbnail file={file} /><Button type="button" variant="outline" size="icon" className="absolute -right-2 -top-2 h-6 w-6 rounded-full" aria-label={`Remove ${platform} screenshot ${i+1}`} onClick={() => onChange(files.filter((_,index) => index !== i))}><X /></Button></div>)}</div>
  </div>;
}