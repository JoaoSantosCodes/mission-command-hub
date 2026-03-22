import { useEffect, useState } from "react";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { fetchJson, putAgentMarkdown } from "@/lib/api";
import type { AgentDetailResponse } from "@/types/hub";

type AgentDetailModalProps = {
  agentId: string | null;
  onClose: () => void;
  /** Quando `false`, não mostra edição (MISSION_AGENT_EDIT=0) */
  canEdit?: boolean;
  onSaved?: () => void;
};

export function AgentDetailModal({
  agentId,
  onClose,
  canEdit = true,
  onSaved,
}: AgentDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AgentDetailResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!agentId) {
      setData(null);
      setLoadErr(null);
      setEditing(false);
      setDraft("");
      setSaveErr(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadErr(null);
    setData(null);
    setEditing(false);
    setDraft("");
    setSaveErr(null);
    void (async () => {
      try {
        const j = await fetchJson<AgentDetailResponse>(`/api/aiox/agents/${encodeURIComponent(agentId)}`);
        if (!cancelled) {
          setData(j);
          setDraft(j.content);
        }
      } catch (e) {
        if (!cancelled) setLoadErr(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

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

  if (!agentId) return null;

  const dirty = data !== null && draft !== data.content;

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
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 id="agent-modal-title" className="truncate font-mono text-sm font-medium text-foreground">
              {data?.id ?? agentId}
            </h2>
            {data?.file ? (
              <p className="truncate text-[11px] text-muted-foreground">
                {data.file}
                {canEdit ? " · editar definição (YAML / skill no bloco do agente)" : null}
              </p>
            ) : null}
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
                <button
                  type="button"
                  onClick={startEdit}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Editar
                </button>
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
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
              A carregar…
            </div>
          ) : loadErr ? (
            <p className="text-sm text-destructive" role="alert">
              {loadErr}
            </p>
          ) : data ? (
            <>
              {saveErr ? (
                <p className="mb-3 text-sm text-destructive" role="alert">
                  {saveErr}
                </p>
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
                  className="min-h-[min(60vh,480px)] w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground outline-none ring-primary focus-visible:ring-2"
                  aria-label="Conteúdo Markdown do agente"
                />
              ) : (
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground">
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
