function toTrimmed(value) {
  return String(value ?? "").trim();
}

function normalizeNodeId(rawNodeId) {
  const node = toTrimmed(rawNodeId);
  if (!node) return "";
  return node.replace(/-/g, ":");
}

export function parseFigmaReference({ figmaUrl, fileKey, nodeId, depth }) {
  let outFileKey = toTrimmed(fileKey);
  let outNodeId = normalizeNodeId(nodeId);
  const outDepth = Number.isFinite(Number(depth)) ? Math.max(1, Math.min(8, Number(depth))) : undefined;

  const maybeUrl = toTrimmed(figmaUrl);
  if (maybeUrl) {
    let u = null;
    try {
      u = new URL(maybeUrl);
    } catch {
      throw new Error("URL Figma inválida.");
    }
    if (!/figma\.com$/i.test(u.hostname)) {
      throw new Error("A URL precisa ser do domínio figma.com.");
    }
    const parts = u.pathname.split("/").filter(Boolean);
    const markerIdx = parts.findIndex((p) => p === "file" || p === "design");
    if (markerIdx >= 0 && parts[markerIdx + 1]) {
      outFileKey = parts[markerIdx + 1];
    }
    const qNode = toTrimmed(u.searchParams.get("node-id"));
    if (qNode) outNodeId = normalizeNodeId(qNode);
  }

  if (!/^[a-zA-Z0-9]+$/.test(outFileKey)) {
    throw new Error("fileKey inválido (esperado alfanumérico).");
  }
  if (outNodeId && !/^I?\d+:\d+(;\d+:\d+)*$/.test(outNodeId)) {
    throw new Error("nodeId inválido (esperado formato 123:456).");
  }

  return {
    fileKey: outFileKey,
    nodeId: outNodeId || undefined,
    depth: outDepth,
  };
}

function countDocumentNodes(root) {
  if (!root || typeof root !== "object") return 0;
  const children = Array.isArray(root.children) ? root.children : [];
  let total = 1;
  for (const child of children) total += countDocumentNodes(child);
  return total;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const raw = await res.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, raw, data };
  } finally {
    clearTimeout(t);
  }
}

export async function fetchFigmaContext({ token, fileKey, nodeId, depth, timeoutMs = 8000 }) {
  const cleanToken = toTrimmed(token);
  if (!cleanToken) throw new Error("Sem FIGMA_ACCESS_TOKEN.");

  const query = [];
  if (Number.isFinite(depth)) query.push(`depth=${encodeURIComponent(String(depth))}`);

  const url = nodeId
    ? `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(nodeId)}${query.length ? `&${query.join("&")}` : ""}`
    : `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}${query.length ? `?${query.join("&")}` : ""}`;

  const r = await fetchWithTimeout(
    url,
    {
      method: "GET",
      headers: { "X-Figma-Token": cleanToken },
    },
    timeoutMs
  );

  if (!r.ok) {
    const msg = String(r.data?.err || r.data?.message || r.raw || `HTTP ${r.status}`).slice(0, 200);
    throw new Error(`Falha ao consultar Figma: ${msg}`);
  }

  const fileName = toTrimmed(r.data?.name);
  const lastModified = toTrimmed(r.data?.lastModified);
  const thumbnailUrl = toTrimmed(r.data?.thumbnailUrl);
  const version = toTrimmed(r.data?.version);
  const rootNode = nodeId ? r.data?.nodes?.[nodeId]?.document : r.data?.document;
  const nodeCount = countDocumentNodes(rootNode);

  return {
    source: { fileKey, nodeId: nodeId || null, depth: Number.isFinite(depth) ? depth : null },
    meta: {
      fileName: fileName || null,
      version: version || null,
      lastModified: lastModified || null,
      thumbnailUrl: thumbnailUrl || null,
    },
    designSummary: {
      nodeCount,
      rootType: toTrimmed(rootNode?.type) || null,
      rootName: toTrimmed(rootNode?.name) || null,
    },
  };
}
