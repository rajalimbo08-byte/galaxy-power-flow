import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { analyzeUpsFault, type FaultDiagnosis } from "@/lib/ai-fault.functions";
import { compressImage } from "@/lib/report-media";

export function FaultScanner({ onApply }: { onApply: (d: FaultDiagnosis) => void }) {
  const run = useServerFn(analyzeUpsFault);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<FaultDiagnosis | null>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const c = await compressImage(file);
      setPreview(c.dataUrl);
      const b64 = c.base64;
      const mimeType = c.dataUrl.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
      const out = await run({ data: { image: b64, mimeType, note: note || undefined } });
      if (out.error) toast.error(out.error);
      else if (out.result) setResult(out.result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  const sevColor =
    result?.severity === "Critical"
      ? "bg-destructive text-destructive-foreground"
      : result?.severity === "Major"
        ? "bg-accent text-accent-foreground"
        : "bg-muted text-foreground";

  return (
    <Card className="shadow-card border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> AI UPS Fault Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          UPS display, alarm light ya kharab part ki photo lijiye — AI fault aur checks batayega.
        </p>
        <Input placeholder="Optional note (e.g. UPS beeping on battery)" value={note} onChange={(e) => setNote(e.target.value)} />
        <label>
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy}
            onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          <span className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {busy ? "Analyzing…" : "Scan fault photo"}
          </span>
        </label>
        {preview && <img src={preview} alt="Fault" className="max-h-48 rounded-md object-contain" />}
        {result && (
          <div className="grid gap-2 rounded-md border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{result.fault_name}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${sevColor}`}>{result.severity}</span>
            </div>
            <div><b>Code:</b> {result.error_code}</div>
            <div><b>Root cause:</b> {result.root_cause}</div>
            {result.checks.length > 0 && (
              <ul className="list-disc pl-5">{result.checks.map((c, i) => <li key={i}>{c}</li>)}</ul>
            )}
            <div><b>Recommendation:</b> {result.recommendation}</div>
            <Button type="button" variant="outline" onClick={() => { onApply(result); toast.success("Added to report"); }}>
              Add to report
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
