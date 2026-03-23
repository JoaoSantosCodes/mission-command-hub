import type { TaskItem } from "@/components/task-canvas/types";
import type { AioxExecResponse } from "@/types/hub";

/** Erro sintético quando `PUT /api/aiox/task-board` devolve 409 (If-Match). */
export const TASK_BOARD_CONFLICT_ERROR = "CONFLICT_TASK_BOARD";

function scopeForHttpStatus(status: number): string {
  if (status === 429) return "Demasiados pedidos";
  if (status === 409) return "Conflito";
  if (status >= 500) return "Erro no servidor";
  if (status >= 400) return "Pedido inválido";
  return "Erro HTTP";
}

const API_FETCH_INIT: RequestInit = { cache: "no-store" };

/** Resposta HTML/404 típica quando só há estático ou a API não está na porta esperada. */
function friendlyNonJsonErrorBody(text: string): string {
  const t = text.slice(0, 800);
  if (/<!DOCTYPE/i.test(t) || /<html/i.test(t) || /Cannot GET \//.test(t)) {
    return (
      "A API não devolveu JSON (HTML ou página de erro em vez de JSON em `/api`). " +
      "Em desenvolvimento, corre `npm run dev` ou `npm run preview` (a ponte Express fica embebida no Vite). " +
      "Em produção local: `npm run build` + `npm start` (tudo na mesma origem, por defeito :8787). " +
      "Se usares `MISSION_EMBED_API=0`, precisas de Express em :8787 (`preview:all` ou `dev:split`)."
    );
  }
  return text;
}

/** Corpo HTTP 200 que não é JSON (ex.: index.html do SPA) — antes `JSON.parse` rebentava sem mensagem útil. */
function parseJsonOkBody<T>(text: string): T {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      "Resposta vazia em `/api` (esperado JSON). Corre `npm run dev` ou `npm run preview`, ou `npm run build` + `npm start`."
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    throw new Error(
      "A resposta em `/api` não era JSON válido. Recarrega após `npm run dev` / `preview`, ou usa `npm run build` + `npm start`."
    );
  }
}

export async function fetchJson<T>(path: string): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, API_FETCH_INIT);
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
      const j = JSON.parse(text) as { error?: string; retryAfterSec?: number };
      if (j?.error) {
        detail = j.error;
        if (r.status === 429 && typeof j.retryAfterSec === "number") {
          detail += ` (repetir daqui a ~${j.retryAfterSec}s)`;
        }
      }
    } catch {
      const friendly = friendlyNonJsonErrorBody(text);
      if (friendly !== text) {
        throw new Error(friendly);
      }
      detail = text;
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(detail ? `${scope}: ${detail}` : `${scope} (${r.status})`);
  }
  return parseJsonOkBody<T>(text);
}

export async function postCommand(command: string): Promise<{ message?: string }> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/command", {
      ...API_FETCH_INIT,
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
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
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
      ...API_FETCH_INIT,
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
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  return data as AioxExecResponse;
}

export async function postDoubtsChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ ok: boolean; reply: string }> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/doubts/chat", {
      ...API_FETCH_INIT,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  let data: { ok?: boolean; reply?: string; error?: string } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  if (!data.reply || typeof data.reply !== "string") {
    throw new Error("Resposta inválida do servidor (sem reply).");
  }
  return { ok: true, reply: data.reply };
}

export async function getTaskBoard(): Promise<{ tasks: TaskItem[]; revision: string }> {
  const d = await fetchJson<{ ok?: boolean; tasks?: TaskItem[]; revision?: string }>("/api/aiox/task-board");
  return {
    tasks: Array.isArray(d.tasks) ? d.tasks : [],
    revision: typeof d.revision === "string" ? d.revision : "0:0",
  };
}

export async function putTaskBoard(tasks: TaskItem[], ifMatchRevision: string): Promise<{ revision: string }> {
  let r: Response;
  try {
    r = await fetch("/api/aiox/task-board", {
      ...API_FETCH_INIT,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": ifMatchRevision,
      },
      body: JSON.stringify({ tasks }),
    });
  } catch (e) {
    throw new Error(
      e instanceof TypeError
        ? "Sem ligação à API. Confirma que o servidor está a correr (ex.: npm run dev)."
        : String(e)
    );
  }
  const text = await r.text();
  if (r.status === 409) {
    throw new Error(TASK_BOARD_CONFLICT_ERROR);
  }
  let data: { ok?: boolean; revision?: string; error?: string } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  const revision = typeof data.revision === "string" ? data.revision : "0:0";
  return { revision };
}

export async function putAgentMarkdown(
  id: string,
  content: string,
  revision?: string | null
): Promise<{ ok: boolean; id: string; bytes: number }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (revision) {
    headers["If-Match"] = revision;
  }
  const r = await fetch(`/api/aiox/agents/${encodeURIComponent(id)}`, {
    ...API_FETCH_INIT,
    method: "PUT",
    headers,
    body: JSON.stringify({ content, ...(revision ? { revision } : {}) }),
  });
  const text = await r.text();
  let data: { ok?: boolean; id?: string; bytes?: number; error?: string; conflict?: boolean } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number; conflict?: boolean };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      if (r.status === 409 && j.conflict) {
        msg += " Recarrega o agente para ver a versão no disco.";
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  return data as { ok: boolean; id: string; bytes: number };
}

export async function createAgent(payload: {
  id: string;
  content?: string;
}): Promise<{ ok: boolean; id: string; bytes: number }> {
  const r = await fetch("/api/aiox/agents", {
    ...API_FETCH_INIT,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  let data: { ok?: boolean; id?: string; bytes?: number; error?: string } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  return data as { ok: boolean; id: string; bytes: number };
}

export async function deleteAgent(id: string): Promise<{ ok: boolean; id: string }> {
  const r = await fetch(`/api/aiox/agents/${encodeURIComponent(id)}`, {
    ...API_FETCH_INIT,
    method: "DELETE",
  });
  const text = await r.text();
  let data: { ok?: boolean; id?: string; error?: string } = {};
  try {
    if (text) data = JSON.parse(text) as typeof data;
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    if (data.error) {
      let msg = data.error;
      const j = data as { retryAfterSec?: number };
      if (r.status === 429 && typeof j.retryAfterSec === "number") {
        msg += ` (repetir daqui a ~${j.retryAfterSec}s)`;
      }
      throw new Error(`${scopeForHttpStatus(r.status)}: ${msg}`);
    }
    const friendly = friendlyNonJsonErrorBody(text);
    if (friendly !== text) {
      throw new Error(friendly);
    }
    const scope = scopeForHttpStatus(r.status);
    throw new Error(text ? `${scope}: ${text}` : `${scope} (${r.status})`);
  }
  return data as { ok: boolean; id: string };
}
