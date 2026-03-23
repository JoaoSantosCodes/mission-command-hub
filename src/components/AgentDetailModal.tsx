import { useEffect, useRef, useState } from "react";
import { HubMascot } from "@/components/HubMascot";
import { AlertCircle, Loader2, Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { deleteAgent, fetchJson, putAgentMarkdown } from "@/lib/api";
import { formatUserFacingError } from "@/lib/format-error";
import {
  pickDisplayName,
  readAgentProfile,
  writeAgentProfile,
} from "@/lib/agent-profile-store";
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

function charIndexForAgentId(agentId: string): number {
  let h = 0;
  for (let i = 0; i < agentId.length; i++) h = (h * 31 + agentId.charCodeAt(i)) >>> 0;
  return h % 6;
}

function extractAgentSkills(content: string): string[] {
  const lines = String(content || "").split(/\r?\n/);
  const out: string[] = [];

  // Heurística 1: bloco "skills:" em YAML/markdown com bullets.
  let inSkills = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inSkills) break;
      continue;
    }
    if (!inSkills && /^skills?\s*:\s*$/i.test(line)) {
      inSkills = true;
      continue;
    }
    if (inSkills) {
      const m = line.match(/^[-*]\s+(.+)$/);
      if (!m) {
        if (/^[a-z0-9_-]+\s*:/i.test(line)) break;
        continue;
      }
      out.push(m[1].replace(/^["']|["']$/g, "").trim());
      if (out.length >= 12) break;
    }
  }
  if (out.length) return out;

  // Heurística 2: secções comuns em PT/EN.
  const all = String(content || "");
  const sec =
    all.match(/(?:^|\n)#{1,4}\s*(?:skills?|compet[êe]ncias?)\s*\n([\s\S]{0,900})/i)?.[1] ??
    all.match(/(?:^|\n)(?:skills?|compet[êe]ncias?)\s*:\s*\n([\s\S]{0,900})/i)?.[1] ??
    "";
  if (sec) {
    for (const l of sec.split(/\r?\n/)) {
      const m = l.trim().match(/^[-*]\s+(.+)$/);
      if (!m) continue;
      out.push(m[1].replace(/^["']|["']$/g, "").trim());
      if (out.length >= 12) break;
    }
  }
  if (out.length) return out;

  // Heurística 3: inferência por palavras-chave do markdown.
  const md = String(content || "").toLowerCase();
  const keywordMap: Array<[RegExp, string]> = [
    [/\b(typescript|ts)\b/, "TypeScript"],
    [/\bjavascript|node\.?js|node\b/, "JavaScript/Node.js"],
    [/\breact|next\.?js|vite\b/, "Front-end"],
    [/\bexpress|fastify|nestjs|api\b/, "APIs"],
    [/\bpostgres|postgresql|mysql|sqlite|sql\b/, "SQL/BD"],
    [/\bredis|cache\b/, "Caching"],
    [/\bdocker|kubernetes|k8s|devops|ci\/cd|github actions\b/, "DevOps"],
    [/\baws|gcp|azure|cloud\b/, "Cloud"],
    [/\bopenai|llm|rag|prompt\b/, "LLM/AI"],
    [/\bqa|test|vitest|jest|cypress|playwright\b/, "Testes"],
    [/\bsecurity|owasp|auth|jwt\b/, "Segurança"],
    [/\bux|ui|figma|design system\b/, "UX/UI"],
    [/\barchitecture|arquitetura|microservices|clean architecture\b/, "Arquitetura"],
    [/\bnotion|swagger|openapi|documenta[cç][aã]o|documentation\b/, "Documentação"],
    [/\banalysis|analyst|requisitos|product|po|pm\b/, "Produto/Análise"],
  ];

  const inferred: string[] = [];
  for (const [re, label] of keywordMap) {
    if (re.test(md)) inferred.push(label);
    if (inferred.length >= 8) break;
  }

  return inferred;
}

function AgentFaceAvatar({
  agentId,
  avatarIndex,
  offsetX = 0,
  offsetY = 0,
}: {
  agentId: string;
  avatarIndex?: number;
  offsetX?: number;
  offsetY?: number;
}) {
  const [failed, setFailed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const charIndex = typeof avatarIndex === "number" ? avatarIndex : charIndexForAgentId(agentId);

  useEffect(() => {
    if (failed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.decoding = "async";
    img.src = `/pixel-assets/characters/char_${charIndex}.png`;
    img.onload = () => {
      try {
        const FRAME_W = 16;
        const FACE_H = 16;
        const pad = 1;
        const cw = canvas.width;
        const target = cw - pad * 2;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cw, canvas.height);
        ctx.drawImage(img, 0, 0, FRAME_W, FACE_H, pad + offsetX, pad + offsetY, target, target);
      } catch {
        setFailed(true);
      }
    };
    img.onerror = () => setFailed(true);
  }, [charIndex, failed, offsetX, offsetY]);

  if (failed) {
    return <HubMascot size="sm" className="h-14 w-14 rounded-lg" />;
  }

  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-[#0a0e14]">
      <canvas
        ref={canvasRef}
        width={56}
        height={56}
        aria-hidden
        style={{ display: "block", width: "100%", height: "100%", imageRendering: "pixelated" }}
      />
    </div>
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
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [profileAvatarDraft, setProfileAvatarDraft] = useState(0);
  const [profileAvatarOffsetXDraft, setProfileAvatarOffsetXDraft] = useState(0);
  const [profileAvatarOffsetYDraft, setProfileAvatarOffsetYDraft] = useState(0);
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
      setProfileNameDraft("");
      setProfileAvatarDraft(0);
      setProfileAvatarOffsetXDraft(0);
      setProfileAvatarOffsetYDraft(0);
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
    setProfileNameDraft("");
    setProfileAvatarDraft(0);
    setProfileAvatarOffsetXDraft(0);
    setProfileAvatarOffsetYDraft(0);
    setSaveErr(null);
    void (async () => {
      try {
        const j = await fetchJson<AgentDetailResponse>(`/api/aiox/agents/${encodeURIComponent(agentId)}`);
        if (seq === loadRequestSeq.current) {
          setData(j);
          setDraft(j.content);
          const p = readAgentProfile(j.id);
          setProfileNameDraft((p.displayName || j.title || j.id).trim());
          setProfileAvatarDraft(
            typeof p.avatarIndex === "number" ? p.avatarIndex : charIndexForAgentId(j.id)
          );
          setProfileAvatarOffsetXDraft(typeof p.avatarOffsetX === "number" ? p.avatarOffsetX : 0);
          setProfileAvatarOffsetYDraft(typeof p.avatarOffsetY === "number" ? p.avatarOffsetY : 0);
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
    const p = readAgentProfile(data.id);
    setProfileNameDraft((p.displayName || data.title || data.id).trim());
    setProfileAvatarDraft(typeof p.avatarIndex === "number" ? p.avatarIndex : charIndexForAgentId(data.id));
    setProfileAvatarOffsetXDraft(typeof p.avatarOffsetX === "number" ? p.avatarOffsetX : 0);
    setProfileAvatarOffsetYDraft(typeof p.avatarOffsetY === "number" ? p.avatarOffsetY : 0);
    setSaveErr(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (data) setDraft(data.content);
    if (data) {
      const p = readAgentProfile(data.id);
      setProfileNameDraft((p.displayName || data.title || data.id).trim());
      setProfileAvatarDraft(typeof p.avatarIndex === "number" ? p.avatarIndex : charIndexForAgentId(data.id));
      setProfileAvatarOffsetXDraft(typeof p.avatarOffsetX === "number" ? p.avatarOffsetX : 0);
      setProfileAvatarOffsetYDraft(typeof p.avatarOffsetY === "number" ? p.avatarOffsetY : 0);
    }
    setEditing(false);
    setSaveErr(null);
  };

  const save = async () => {
    if (!agentId || !data) return;
    setSaving(true);
    setSaveErr(null);
    try {
      if (draft !== data.content) {
        await putAgentMarkdown(agentId, draft, data.revision);
      }
      const j = await fetchJson<AgentDetailResponse>(`/api/aiox/agents/${encodeURIComponent(agentId)}`);
      writeAgentProfile(j.id, {
        displayName: profileNameDraft,
        avatarIndex: profileAvatarDraft,
        avatarOffsetX: profileAvatarOffsetXDraft,
        avatarOffsetY: profileAvatarOffsetYDraft,
      });
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

  const storedProfile = data ? readAgentProfile(data.id) : {};
  const persistedName = data ? pickDisplayName(data.id, data.title) : "";
  const persistedAvatar =
    data && typeof storedProfile.avatarIndex === "number"
      ? storedProfile.avatarIndex
      : data
        ? charIndexForAgentId(data.id)
        : 0;
  const persistedOffsetX =
    data && typeof storedProfile.avatarOffsetX === "number" ? storedProfile.avatarOffsetX : 0;
  const persistedOffsetY =
    data && typeof storedProfile.avatarOffsetY === "number" ? storedProfile.avatarOffsetY : 0;
  const displayNameNow = editing ? profileNameDraft.trim() : persistedName;
  const avatarNow = editing ? profileAvatarDraft : persistedAvatar;
  const offsetXNow = editing ? profileAvatarOffsetXDraft : persistedOffsetX;
  const offsetYNow = editing ? profileAvatarOffsetYDraft : persistedOffsetY;
  const dirty =
    data !== null &&
    (draft !== data.content ||
      profileNameDraft.trim() !== persistedName ||
      profileAvatarDraft !== persistedAvatar ||
      profileAvatarOffsetXDraft !== persistedOffsetX ||
      profileAvatarOffsetYDraft !== persistedOffsetY);
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
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/[0.08] ring-1 ring-primary/15">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-gradient-to-br from-primary/[0.1] via-card to-secondary/25 px-4 py-4 sm:px-5">
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
                {displayNameNow && data?.id && displayNameNow !== data.id ? (
                  <span className="font-sans text-muted-foreground"> — {displayNameNow}</span>
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
              {(() => {
                const skills = extractAgentSkills(data.content);
                return (
              <section className="mb-4 rounded-xl border border-border bg-background/40 p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <AgentFaceAvatar
                    agentId={data.id}
                    avatarIndex={avatarNow}
                    offsetX={offsetXNow}
                    offsetY={offsetYNow}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Currículo do agente</p>
                    <h3 className="truncate font-mono text-sm font-semibold text-foreground">
                      {displayNameNow || data.id}
                    </h3>
                    <p className="truncate text-xs text-muted-foreground" title={data.id}>
                      {data.id}
                    </p>
                  </div>
                </div>
                {editing ? (
                  <>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Nome de exibição
                      <input
                        value={profileNameDraft}
                        onChange={(e) => setProfileNameDraft(e.target.value)}
                        placeholder={data.title || data.id}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs normal-case text-foreground outline-none focus:border-primary"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Foto (avatar)
                      <select
                        value={profileAvatarDraft}
                        onChange={(e) => setProfileAvatarDraft(Number(e.target.value))}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs normal-case text-foreground outline-none focus:border-primary"
                      >
                        {Array.from({ length: 6 }, (_, i) => (
                          <option key={i} value={i}>
                            Rosto {i + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Posição X ({profileAvatarOffsetXDraft})
                      <input
                        type="range"
                        min={-6}
                        max={6}
                        step={1}
                        value={profileAvatarOffsetXDraft}
                        onChange={(e) => setProfileAvatarOffsetXDraft(Number(e.target.value))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Posição Y ({profileAvatarOffsetYDraft})
                      <input
                        type="range"
                        min={-6}
                        max={6}
                        step={1}
                        value={profileAvatarOffsetYDraft}
                        onChange={(e) => setProfileAvatarOffsetYDraft(Number(e.target.value))}
                      />
                    </label>
                  </div>
                  </>
                ) : null}
                <div className="mt-3">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Skills</p>
                  {skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Sem skills explícitas no bloco YAML/Markdown.</p>
                  )}
                </div>
              </section>
                );
              })()}

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
                <pre className="whitespace-pre-wrap break-words rounded-xl border border-border/70 bg-muted/20 p-4 font-mono text-[11px] leading-relaxed text-foreground shadow-inner dark:bg-background/40">
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
