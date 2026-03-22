import path from "path";

/** Mostra só o último segmento (útil quando `MASK_PATHS_IN_UI` está activo). */
export function maskAbsolutePath(p) {
  if (!p || typeof p !== "string") return "—";
  const n = path.normalize(p);
  const base = path.basename(n);
  if (!base || base === "." || base === "..") return "…";
  return `…/${base}`;
}

export function shouldMaskPathsInUi() {
  const v = process.env.MASK_PATHS_IN_UI;
  return v === "1" || v === "true";
}
