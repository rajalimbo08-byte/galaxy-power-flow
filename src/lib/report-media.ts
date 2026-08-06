/** Client-side image compression: downscales and re-encodes to JPEG. */
export async function compressImage(
  file: File,
  maxEdge = 1400,
  quality = 0.7,
): Promise<{ dataUrl: string; base64: string; size: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process this image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1] ?? "";
  return { dataUrl, base64, size: Math.round((base64.length * 3) / 4) };
}

export function dataUrlToBase64(dataUrl: string) {
  return dataUrl.split(",")[1] ?? "";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}