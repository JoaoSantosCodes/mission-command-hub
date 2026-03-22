import type { AioxExecResponse } from "@/types/hub";

export async function fetchJson<T>(path: string): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path);
  } catch (e) {
    const msg =
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : `Erro de rede: ${String(e)}`;
    throw new Error(msg);
  }
  const text = await r.text();
  if (!r.ok) {
    let detail = text;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j?.error) detail = j.error;
    } catch {
      /* raw text */
    }
    const scope =
      r.status >= 500 ? "Erro no servidor" : r.status >= 400 ? "Pedido inválido" : "Erro HTTP";
    throw new Error(detail ? `${scope}: ${detail}` : `${scope} (${r.status})`);
  }
  return JSON.parse(text) as T;
}

export async function postCommand(command: string): Promise<{ message?: string }> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  let data: { ok?: boolean; message?: string; error?: string } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* corpo não-JSON */
  }
  if (!r.ok) {
    const scope =
      r.status >= 500 ? "Erro no servidor" : r.status >= 400 ? "Pedido inválido" : "Erro HTTP";
    const detail = data.error ?? text;
    throw new Error(detail ? `${scope}: ${detail}` : `${scope} (${r.status})`);
  }
  return data;
}

export async function postAioxExec(
  subcommand: "doctor" | "info",
  confirm: string
): Promise<AioxExecResponse> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subcommand, confirm }),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  let data = {} as AioxExecResponse & { error?: string };
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    const scope =
      r.status >= 500 ? "Erro no servidor" : r.status >= 400 ? "Pedido inválido" : "Erro HTTP";
    const detail = data.error ?? text;
    throw new Error(detail ? `${scope}: ${detail}` : `${scope} (${r.status})`);
  }
  return data as AioxExecResponse;
}

export async function putAgentMarkdown(
  id: string,
  content: string
): Promise<{ ok: boolean; id: string; bytes: number }> {
  const r = await fetch(`/api/aiox/agents/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const text = await r.text();
  let data: { ok?: boolean; id?: string; bytes?: number; error?: string } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    const scope =
      r.status >= 500 ? "Erro no servidor" : r.status >= 400 ? "Pedido inválido" : "Erro HTTP";
    const detail = data.error ?? text;
    throw new Error(detail ? `${scope}: ${detail}` : `${scope} (${r.status})`);
  }
  return data as { ok: boolean; id: string; bytes: number };
}
