import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FaultDiagnosis = {
  fault_name: string;
  error_code: string;
  severity: "Critical" | "Major" | "Minor" | "Unknown";
  root_cause: string;
  checks: string[];
  recommendation: string;
};

const PROMPT = `You are a senior Online UPS / battery bank service engineer in India.
Look at this photo (UPS LCD display, alarm LEDs, fault panel, or damaged component).
Identify any visible error/alarm code and the fault. Reply ONLY with JSON:
{"fault_name":string,"error_code":string (or "None visible"),"severity":"Critical"|"Major"|"Minor"|"Unknown","root_cause":string,"checks":string[] (3-6 short step checks for the engineer),"recommendation":string}
Use concise professional English. If the image is not UPS related, say so in fault_name and use severity "Unknown".`;

export const analyzeUpsFault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        image: z.string().min(100).max(8_000_000),
        mimeType: z.string().regex(/^image\//),
        note: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ result?: FaultDiagnosis; error?: string }> => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) return { error: "Gemini key is not configured." };
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT + (data.note ? `\nEngineer note: ${data.note}` : "") },
                { inline_data: { mime_type: data.mimeType, data: data.image } },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    if (!res.ok) {
      console.error("Gemini error", res.status, await res.text());
      if (res.status === 429) return { error: "AI limit reached, try again in a minute." };
      if (res.status === 400 || res.status === 403) return { error: "Gemini key rejected. Please check the key." };
      return { error: "AI service unavailable, try again." };
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { error: "AI could not read this photo." };
    try {
      const r = JSON.parse(text) as FaultDiagnosis;
      return { result: { ...r, checks: Array.isArray(r.checks) ? r.checks : [] } };
    } catch {
      return { error: "AI returned an unreadable answer." };
    }
  });
