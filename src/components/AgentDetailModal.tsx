import { useEffect, useRef, useState } from "react";
import { HubMascot } from "@/components/HubMascot";
import { AlertCircle, Loader2, Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { deleteAgent, fetchJson, putAgentMarkdown } from "@/lib/api";
import { formatUserFacingError } from "@/lib/format-error";
import type { AgentDetailResponse } from "@/types/hub";

/** Erros em que faz sentido voltar a pedir quando a API estiver de pé. */
function isLikelyConnectionFailure(formattedMessage: string): boolean {
  const m = formattedMessage.toLowerCase();
  return (
    m.includes("não devolveu json") ||
    m.includes("não era json válido") ||
    m.includes("resposta vazia da api") ||
    m.includes("sem ligação à api") ||
    m.includes("erro de rede") ||
    m.includes("failed to fetch")
  );
}

type AgentDetailModalProps = {
  agentId: string | null;
  onClose: () => void;
  /** Quando `false`, não mostra edição (MISSION_AGENT_EDIT=0) */
  canEdit?: boolean;
  onSaved?: () => void;
  /** Estado da API (mesmo indicador do header). */
  apiOnline?: boolean | null;
  /** Re-sincronizar hub (info, agentes, feed) antes de voltar a pedir o agente. */
  onRetryConnection?: () => void;
  /** Após eliminar o ficheiro `.md` com sucesso. */
  onDeleted?: () => void;
};

export function AgentDetailModal({
  agentId,
  onClose,
  canEdit = true,
  onSaved,
  apiOnline = null,
  onRetryConnection,
  onDeleted,
}: AgentDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AgentDetailResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const onRetryRef = useRef(onRetryConnection);
  onRetryRef.current = onRetryConnection;
  /** Evita `setLoading(false)` de um pedido antigo quando já há outro em curso (evita spinner infinito). */
  const loadRequestSeq = useRef(0);
  const loadingRef = useRef(false);
  loadingRef.current = loading;

  /** Enquanto o erro for de ligação, verifica /api/health a cada 5s — só dispara novo GET quando não há pedido activo. */
  useEffect(() => {
    if (!agentId || !loadErr) return;
    const msg = formatUserFacingError(loadErr);
    if (!isLikelyConnectionFailure(msg)) return;

    const id = window.setInterval(() => {
      void (async () => {
        if (loadingRef.current) return;
        try {
          const r = await fetch("/api/health", { cache: "no-store" });
          if (r.ok) {
            onRetryRef.current?.();
            setRetryNonce((n) => n + 1);
          }
        } catch {
          /* API ainda não responde */
        }
      })();
    }, 5000);
    return () => window.clearInterval(id);
  }, [agentId, loadErr]);

  useEffect(() => {
    if (!agentId) {
      loadRequestSeq.current += 1;
      setData(null);
      setLoadErr(null);
      setEditing(false);
      setDraft("");
      setSaveErr(null);
      setLoading(false);
      return;
    }
    const seq = ++loadRequestSeq.current;
    setLoading(true);
    setLoadErr(null);
    setData(null);
    setEditing(false);
    setDraft("");
    setSaveErr(null);
    void (async () => {
      try {
        const j = await fetchJson<AgentDetailResponse>(`/api/aiox/agents/${encodeURIComponent(agentId)}`);
        if (seq === loadRequestSeq.current) {
          setData(j);
          setDraft(j.content);
        }
      } catch (e) {
        if (seq === loadRequestSeq.current) {
          setLoadErr(String(e));
        }
      } finally {
        if (seq === loadRequestSeq.current) {
          setLoading(false);
        }
      }
    })();
  }, [agentId, retryNonce]);

  const retryLoad = () => {
    onRetryRef.current?.();
    setRetryNonce((n) => n + 1);
  };

  const startEdit = () => {
    if (!data) return;
    setDraft(data.content);
    setSaveErr(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (data) setDraft(data.content);
    setEditing(false);
    setSaveErr(null);
  };

  const save = async () => {
    if (!agentId || !data) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await putAgentMarkdown(agentId, draft);
      const j = await fetchJson<AgentDetailResponse>(`/api/aiox/agents/${encodeURIComponent(agentId)}`);
      setData(j);
      setDraft(j.content);
      setEditing(false);
      onSaved?.();
    } catch (e) {
      setSaveErr(String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!agentId || !data || deleting) return;
    const ok = window.confirm(
      `Eliminar o agente «${data.id}»? O ficheiro ${data.file} será apagado permanentemente do disco.`
    );
    if (!ok) return;
    setDeleting(true);
    setSaveErr(null);
    try {
      await deleteAgent(agentId);
      onDeleted?.();
      onClose();
    } catch (e) {
      setSaveErr(String(e));
    } finally {
      setDeleting(false);
    }
  };

  if (!agentId) return null;

  const dirty = data !== null && draft !== data.content;
  const showApiWarning = apiOnline === false;
  const showAutoRetryHint =
    loadErr != null && isLikelyConnectionFailure(formatUserFacingError(loadErr));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="agent-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/[0.06] ring-1 ring-primary/10">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-card via-card to-secondary/20 px-4 py-3.5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <HubMascot size="sm" className="mt-0.5 hidden sm:inline-flex" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Architecture Agents Hub
              </p>
              <h2 id="agent-modal-title" className="mt-0.5 truncate text-base font-semibold tracking-tight text-foreground">
                Definição do agente
              </h2>
              <p className="truncate font-mono text-xs text-primary/90" title={data?.id ?? agentId}>
                {data?.id ?? agentId}
                {data?.title && data.title.trim() && data.title !== data.id ? (
                  <span className="font-sans text-muted-foreground"> — {data.title}</span>
                ) : null}
              </p>
              {data?.file ? (
                <p className="truncate text-[11px] text-muted-foreground">
                  {data.file}
                  {canEdit ? " · YAML / skill no bloco do agente" : null}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canEdit && data && !loading ? (
              editing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving || !dirty}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                    ) : (
                      <Save className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Gravar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove()}
                    disabled={deleting}
                    className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2.5 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                    title="Eliminar ficheiro do agente"
                  >
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Eliminar
                  </button>
                </>
              )
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Fechar (Esc)"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {showApiWarning ? (
          <div
            className="shrink-0 border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-200/95"
            role="status"
          >
            Indicador do header: <strong className="font-medium">API offline</strong> — em dev/preview a ponte corre embebida no Vite em{" "}
            <span className="font-mono">/api</span>. Corre <span className="font-mono">npm run dev</span> ou{" "}
            <span className="font-mono">npm run preview</span>; em produção local usa <span className="font-mono">npm run build</span> +{" "}
            <span className="font-mono">npm start</span>.
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none text-primary/80" aria-hidden />
              <p>A carregar definição…</p>
            </div>
          ) : loadErr ? (
            <div
              className="rounded-xl border border-destructive/35 bg-destructive/[0.07] p-4 sm:p-5"
              role="alert"
            >
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
                <div className="min-w-0 flex-1 space-y-4">
                  <p className="text-sm leading-relaxed text-destructive">{formatUserFacingError(loadErr)}</p>
                  {showAutoRetryHint ? (
                    <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
                      <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span>
                        Nova tentativa automática a cada 5s quando{" "}
                        <span className="font-mono text-foreground/90">/api/health</span> responder (mesmo host que a
                        página; só se nenhum pedido estiver em curso).
                      </span>
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => retryLoad()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                      Tentar novamente
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg border border-transparent px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : data ? (
            <>
              {saveErr ? (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formatUserFacingError(saveErr)}
                </div>
              ) : null}
              {editing ? (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "s") {
                      e.preventDefault();
                      if (dirty && !saving) void save();
                    }
                  }}
                  spellCheck={false}
                  className="min-h-[min(60vh,480px)] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground outline-none ring-primary focus-visible:ring-2"
                  aria-label="Conteúdo Markdown do agente"
                />
              ) : (
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-background/50 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                  {data.content}
                </pre>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
