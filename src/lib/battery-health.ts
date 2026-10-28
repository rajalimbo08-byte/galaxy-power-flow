// Weak-cell limits: 2V cells below 1.95V, 12V blocks below 11.8V.
export function cellStatus(raw: string): "empty" | "ok" | "weak" | "invalid" {
  const v = Number(raw);
  if (!raw.trim()) return "empty";
  if (!Number.isFinite(v) || v <= 0) return "invalid";
  if (v < 4) return v < 1.95 ? "weak" : "ok";
  return v < 11.8 ? "weak" : "ok";
}

export function weakCells(cells: string[]): number[] {
  return cells.flatMap((c, i) => (cellStatus(c) === "weak" ? [i + 1] : []));
}
