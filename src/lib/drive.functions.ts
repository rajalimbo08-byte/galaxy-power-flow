import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lovableKey || !driveKey) throw new Error("Google Drive is not connected for this project.");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": driveKey,
  };
}

async function driveFetch(path: string, init: RequestInit) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Drive request failed [${res.status}]: ${body}`);
    throw new Error(`Google Drive request failed [${res.status}]: ${body}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/** Finds (or creates) a folder by name under an optional parent. */
async function ensureFolder(name: string, parentId?: string): Promise<string> {
  const escaped = name.replace(/'/g, "\\'");
  const q = [
    `name = '${escaped}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    parentId ? `'${parentId}' in parents` : null,
  ]
    .filter(Boolean)
    .join(" and ");

  try {
    const found = (await driveFetch(
      `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`,
      { method: "GET" },
    )) as { files?: { id: string }[] };
    if (found.files?.[0]?.id) return found.files[0].id;
  } catch {
    // Search can be restricted by scope; fall through to creating the folder.
  }

  const created = await driveFetch("/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  return created["id"] as string;
}

/** Resolves Galaxy Service Reports / <year-month> / <report number> and returns the folder id. */
export const ensureReportFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ reportNumber: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    const root = await ensureFolder("Galaxy Service Reports");
    const month = await ensureFolder(new Date().toISOString().slice(0, 7), root);
    const folderId = await ensureFolder(data.reportNumber, month);
    return { folderId };
  });

const uploadSchema = z.object({
  folderId: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(1).max(120),
  base64: z.string().min(1).max(20_000_000),
});

/** Uploads a base64 payload into a Drive folder and returns its id + view link. */
export const uploadToDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => uploadSchema.parse(input))
  .handler(async ({ data }) => {
    const boundary = `galaxy${Math.random().toString(36).slice(2)}`;
    const metadata = JSON.stringify({ name: data.fileName, parents: [data.folderId] });
    const binary = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));

    const encoder = new TextEncoder();
    const head = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${data.mimeType}\r\n\r\n`,
    );
    const tail = encoder.encode(`\r\n--${boundary}--\r\n`);
    const body = new Uint8Array(head.length + binary.length + tail.length);
    body.set(head, 0);
    body.set(binary, head.length);
    body.set(tail, head.length + binary.length);

    const res = await fetch(
      `${GATEWAY}/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size`,
      {
        method: "POST",
        headers: { ...headers(), "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`Drive upload failed [${res.status}]: ${text}`);
      throw new Error(`Google Drive upload failed [${res.status}]: ${text}`);
    }
    const file = (await res.json()) as { id: string; webViewLink?: string; size?: string };
    return {
      id: file.id,
      link: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
      size: file.size ? Number(file.size) : null,
    };
  });