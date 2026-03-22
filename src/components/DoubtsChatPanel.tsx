import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { BookOpen, Copy, Download, Loader2, MessageCircle, RotateCcw, Send, Upload, X } from "lucide-react";
import { fetchJson, postDoubtsChat } from "@/lib/api";
import type { AioxDoubtsCapabilities } from "@/types/hub";

const STORAGE_KEY = "mission-agent-doubts-chat-v1";

type Msg = { id: string; role: "user" | "assistant"; text: string; at: number };

function loadMsgs(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [welcomeMsg()];
    const p = JSON.parse(raw) as Msg[];
    return Array.isArray(p) && p.length > 0 ? p : [welcomeMsg()];
  } catch {
    return [welcomeMsg()];
  }
}

function welcomeMsg(): Msg {
  return {
    id: "welcome",
    role: "assistant",
    at: Date.now(),
    text:
      "Bem-vindo ao Architecture Agents Hub. Escreve abaixo para registar notas ou dúvidas (ficam na sessão deste separador).\n\n" +
      "Podes exportar ou importar o histórico em JSON na barra acima. Para respostas com IA, usa o Chat do Cursor (Ctrl+L ou Cmd+L). Documentação: MissionAgent/docs/ — INTEGRATIONS.md, MCP.md, CHECKLIST.md.",
  };
}

/** Limite por nota para evitar `sessionStorage` excessivo. */
const MAX_DRAFT_LEN = 16_000;

function normalizeImported(raw: unknown): Msg[] | null {
  let arr: unknown[];
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === "object" && "messages" in raw && Array.isArray((raw as { messages: unknown }).messages)) {
    arr = (raw as { messages: unknown[] }).messages;
  } else return null;
  const out: Msg[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const role = o.role === "user" || o.role === "assistant" ? o.role : null;
    const text = typeof o.text === "string" ? o.text : "";
    if (!role || !text.trim()) continue;
    out.push({
      id: typeof o.id === "string" ? o.id : `import-${Date.now()}-${out.length}`,
      role,
      text,
      at: typeof o.at === "number" && Number.isFinite(o.at) ? o.at : Date.now(),
    });
  }
  return out.length > 0 ? out : null;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

const FAQ = [
  {
    q: "A API não responde / erro JSON",
    a: "Em desenvolvimento, corre `npm run dev` na pasta MissionAgent — a API fica embebida em `/api`. Ver README.",
  },
  {
    q: "Onde ficam os agentes?",
    a: "Ficheiros `.md` em `aiox-core/.aiox-core/development/agents/`. Podes criar novos pela sidebar (**Novo**) se a edição estiver permitida.",
  },
  {
    q: "Notion e Figma?",
    a: "Configuração no Cursor (MCP), não dentro desta UI. Ver `docs/INTEGRATIONS.md`.",
  },
  {
    q: "O painel Dúvidas fala com a API?",
    a: "GET /api/aiox/doubts indica se o LLM no servidor está activo. Com MISSION_DOUBTS_LLM=1 e chave, as mensagens podem ir a POST /api/aiox/doubts/chat; caso contrário só notas locais em sessionStorage.",
  },
];

type DoubtsChatPanelProps = {
  open: boolean;
  onClose: () => void;
};

function exportJson(messages: Msg[]) {
  const payload = { exportedAt: new Date().toISOString(), messages };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mission-agent-duvidas-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportMarkdown(messages: Msg[]) {
  const lines = messages.map((m) => {
    const who = m.role === "user" ? "Tu" : "Nota";
    const when = new Date(m.at).toLocaleString("pt-PT");
    return `### ${who} (${when})\n\n${m.text}`;
  });
  const body = [`# Architecture Agents Hub — notas (export)`, "", ...lines].join("\n\n---\n\n");
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mission-agent-duvidas-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function DoubtsChatPanel({ open, onClose }: DoubtsChatPanelProps) {
  const [tab, setTab] = useState<"chat" | "faq">("chat");
  const [messages, setMessages] = useState<Msg[]>(loadMsgs);
  const [draft, setDraft] = useState("");
  const [serverCaps, setServerCaps] = useState<AioxDoubtsCapabilities | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, tab]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      if (tab !== "chat") return;
      document.getElementById("doubts-input")?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, tab]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchJson<AioxDoubtsCapabilities>("/api/aiox/doubts")
      .then((d) => {
        if (!cancelled && d?.ok) setServerCaps(d);
      })
      .catch(() => {
        if (!cancelled) setServerCaps(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const applyImported = (next: Msg[]) => {
    setMessages(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? "")) as unknown;
        const msgs = normalizeImported(parsed);
        if (!msgs) {
          window.alert("Ficheiro JSON inválido: espera-se um array de mensagens ou { \"messages\": [...] }.");
          return;
        }
        if (
          !window.confirm(
            `Substituir o histórico atual por ${msgs.length} mensagem(ns) importada(s)?`
          )
        ) {
          return;
        }
        applyImported(msgs);
      } catch {
        window.alert("Não foi possível ler o JSON.");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  if (!open) return null;

  const send = () => {
    void (async () => {
      const t = draft.trim();
      if (!t || t.length > MAX_DRAFT_LEN || llmBusy) return;
      const uid = `u-${Date.now()}`;
      const userMsg: Msg = { id: uid, role: "user", text: t, at: Date.now() };
      setDraft("");

      if (serverCaps?.llmEnabled) {
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setLlmBusy(true);
        try {
          const apiMessages = nextMessages
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, content: m.text }));
          const { reply } = await postDoubtsChat(apiMessages);
          setMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: "assistant", text: reply, at: Date.now() },
          ]);
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              text: `Não foi possível obter resposta do modelo.\n\n${err}`,
              at: Date.now(),
            },
          ]);
        } finally {
          setLlmBusy(false);
        }
        return;
      }

      setMessages((m) => [
        ...m,
        userMsg,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          at: Date.now(),
          text:
            "Esta janela não envia o teu texto a um servidor LLM — é apenas um bloco de notas com histórico na sessão.\n\n" +
            "• Perguntas técnicas com modelo: Chat do Cursor.\n" +
            "• Contrato HTTP: docs/openapi.yaml.\n" +
            "• MCP / Notion / Figma: docs/INTEGRATIONS.md.",
        },
      ]);
    })();
  };

  const clearHistory = () => {
    if (
      !window.confirm(
        "Apagar todo o histórico de notas desta sessão? (A mensagem de boas-vindas volta a aparecer.)"
      )
    ) {
      return;
    }
    const w = welcomeMsg();
    setMessages([w]);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([w]));
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
        aria-label="Fechar painel de dúvidas"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
        role="dialog"
        aria-modal
        aria-labelledby="doubts-panel-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <h2 id="doubts-panel-title" className="truncate text-sm font-semibold text-foreground">
              Dúvidas & ajuda
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Fechar (Esc)"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            tabIndex={-1}
            onChange={onImportFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Carregar histórico a partir de JSON (exportado aqui)"
          >
            <Upload className="h-3 w-3" aria-hidden />
            Importar
          </button>
          <button
            type="button"
            onClick={() => exportJson(messages)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Descarregar histórico em JSON"
          >
            <Download className="h-3 w-3" aria-hidden />
            JSON
          </button>
          <button
            type="button"
            onClick={() => exportMarkdown(messages)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Descarregar histórico em Markdown"
          >
            <Download className="h-3 w-3" aria-hidden />
            Markdown
          </button>
          <button
            type="button"
            onClick={clearHistory}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-destructive"
            title="Repor conversa ao estado inicial"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Limpar
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-border px-2 py-2">
          <button
            type="button"
            onClick={() => setTab("chat")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "chat" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setTab("faq")}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "faq" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            FAQ
          </button>
        </div>

        {tab === "faq" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
            <ul className="space-y-4">
              {FAQ.map((item) => (
                <li key={item.q} className="rounded-xl border border-border bg-background/40 p-3">
                  <p className="text-xs font-semibold text-foreground">{item.q}</p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{item.a}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
              <ul className="flex flex-col gap-3" aria-live="polite">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={`max-w-[95%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto bg-primary/15 text-foreground"
                        : "mr-auto border border-border/80 bg-secondary/30 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`min-w-0 flex-1 whitespace-pre-wrap ${m.role === "user" ? "text-foreground" : ""}`}>
                        {m.text}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded p-1 text-muted-foreground/80 hover:bg-background/80 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        title="Copiar texto"
                        aria-label="Copiar texto da mensagem"
                        onClick={() => void copyText(m.text)}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
                <div ref={endRef} />
              </ul>
            </div>
            <div className="shrink-0 border-t border-border p-3">
              <label className="sr-only" htmlFor="doubts-input">
                Mensagem
              </label>
              <div className="flex gap-2">
                <textarea
                  id="doubts-input"
                  value={draft}
                  maxLength={MAX_DRAFT_LEN}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={2}
                  disabled={llmBusy}
                  placeholder="Escreve uma dúvida ou nota… (Enter envia)"
                  className="min-h-[2.75rem] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!draft.trim() || llmBusy}
                  className="shrink-0 self-end rounded-lg bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                  title="Enviar"
                  aria-label={llmBusy ? "A aguardar resposta" : "Enviar mensagem"}
                >
                  {llmBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Atalho global (fora de campos de texto): <strong className="font-medium text-foreground">Ctrl+/</strong>{" "}
                ou <strong className="font-medium text-foreground">Cmd+/</strong>. Máx. {MAX_DRAFT_LEN.toLocaleString(
                  "pt-PT"
                )}{" "}
                caracteres por nota.
                {!serverCaps ? (
                  <> Sem LLM no servidor — usa o Chat do Cursor para IA.</>
                ) : serverCaps.llmEnabled ? (
                  <> Respostas via modelo no servidor (opt-in).</>
                ) : null}
              </p>
              {serverCaps?.message ? (
                <p
                  className="mt-2 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground"
                  role="status"
                >
                  {serverCaps.message}
                  {serverCaps.docsUrl ? (
                    <>
                      {" "}
                      <a
                        href={serverCaps.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Ligação de ajuda
                      </a>
                      .
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
