import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Coffee, Cog, Search } from "lucide-react";
import type { ActivityEntry, AgentRow } from "@/types/hub";
import {
  getAgentStatusesFromLogs,
  type AgentLiveStatus,
} from "@/lib/agent-status-from-logs";
import {
  AGENT_PROFILE_CHANGED_EVENT,
  pickDisplayName,
  readAgentProfile,
} from "@/lib/agent-profile-store";

type TeamStatusOverviewProps = {
  agents: AgentRow[];
  logs: ActivityEntry[];
  loading: boolean;
  onSelectAgent: (a: AgentRow) => void;
  compact?: boolean;
};

const AVATAR_HUES = [200, 265, 145, 35, 330, 175, 25, 310];

function PixelAvatar({ seed, index }: { seed: string; index: number }) {
  const hue = AVATAR_HUES[(seed.length + index) % AVATAR_HUES.length];
  return (
    <div
      className="relative h-10 w-10 shrink-0 overflow-hidden rounded border-2 border-white/15 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.4)]"
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 55% 42%) 0%, hsl(${hue} 45% 28%) 100%)`,
        imageRendering: "pixelated",
      }}
      aria-hidden
    >
      <div className="absolute left-2 top-2.5 h-1.5 w-1.5 bg-[#0a0e14]" />
      <div className="absolute right-2 top-2.5 h-1.5 w-1.5 bg-[#0a0e14]" />
      <div className="absolute bottom-2 left-1/2 h-0.5 w-4 -translate-x-1/2 bg-[#0a0e14]/75" />
    </div>
  );
}

function charIndexForAgentId(agentId: string): number {
  // Estável e determinístico: não depende de props externas.
  let h = 0;
  for (let i = 0; i < agentId.length; i++) h = (h * 31 + agentId.charCodeAt(i)) >>> 0;
  return h % 6;
}

function AgentCharAvatar({ agentId, index }: { agentId: string; index: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const profile = readAgentProfile(agentId);
  const charIndex = typeof profile.avatarIndex === "number" ? profile.avatarIndex : charIndexForAgentId(agentId);
  const offX = typeof profile.avatarOffsetX === "number" ? profile.avatarOffsetX : 0;
  const offY = typeof profile.avatarOffsetY === "number" ? profile.avatarOffsetY : 0;

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
        const frameX = 0;
        const frameY = 0; // idle top row

        const cw = canvas.width;
        const ch = canvas.height;
        const pad = 1;
        const target = cw - pad * 2;

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cw, ch);

        // Mostra só a metade superior do frame (rosto), para ficar legível no card.
        ctx.drawImage(
          img,
          frameX,
          frameY,
          FRAME_W,
          FACE_H,
          pad + offX,
          pad + offY,
          target,
          target
        );
      } catch {
        setFailed(true);
      }
    };
    img.onerror = () => setFailed(true);
  }, [charIndex, failed, offX, offY]);

  if (failed) return <PixelAvatar seed={agentId} index={index} />;

  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-[#0a0e14]">
      <canvas
        ref={canvasRef}
        width={36}
        height={36}
        aria-hidden
        style={{ display: "block", width: "100%", height: "100%", imageRendering: "pixelated" }}
      />
    </div>
  );
}

function statusLabelPt(s: AgentLiveStatus): string {
  // Rótulos no formato do mock do projeto.
  // «thinking» é tratado como WORKING (mantendo ícone de atenção).
  if (s === "idle") return "IDLE";
  return "WORKING";
}

export function TeamStatusOverview({
  agents,
  logs,
  loading,
  onSelectAgent,
  compact = false,
}: TeamStatusOverviewProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "working" | "idle">("all");
  const [profileTick, setProfileTick] = useState(0);

  useEffect(() => {
    const onChanged = () => setProfileTick((v) => v + 1);
    window.addEventListener(AGENT_PROFILE_CHANGED_EVENT, onChanged as EventListener);
    window.addEventListener("storage", onChanged);
    return () => {
      window.removeEventListener(AGENT_PROFILE_CHANGED_EVENT, onChanged as EventListener);
      window.removeEventListener("storage", onChanged);
    };
  }, []);

  const statusMap = useMemo(() => getAgentStatusesFromLogs(agents, logs), [agents, logs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((a) => {
      const info = statusMap.get(a.id) ?? { status: "idle" as const, hint: "" };
      const busy = info.status === "working" || info.status === "thinking";
      if (filter === "working" && !busy) return false;
      if (filter === "idle" && busy) return false;
      if (q) {
        const hay = `${a.id} ${a.title}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [agents, statusMap, filter, query, profileTick]);

  return (
    <div
      className="team-status-panel flex h-full flex-col rounded-xl border border-border bg-card/50"
    >
      <div className={`border-b border-border ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}>
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado da equipa</h2>
        <p className="mt-0.5 text-[10px] tracking-wide text-emerald-400/80">Feed · Architecture Agents Hub</p>
        <div className={compact ? "relative mt-1.5" : "relative mt-2"}>
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar…"
            className={`w-full rounded-lg border border-border bg-background/60 pl-8 pr-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary ${compact ? "py-1" : "py-1.5"}`}
            aria-label="Pesquisar agente"
          />
        </div>
        <div className={`${compact ? "mt-1.5" : "mt-2"} flex gap-2`} role="tablist" aria-label="Filtrar por estado">
          {(
            [
              ["all", "TODOS"],
              ["working", "TRABALHAR"],
              ["idle", "LIVRE"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`flex-1 rounded-md border px-2 ${compact ? "py-0.5" : "py-1"} text-[10px] font-medium uppercase tracking-wide transition-colors ${
                filter === key
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`scrollbar-thin min-h-0 flex-1 overflow-y-auto ${compact ? "p-2" : "p-3"}`}>
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">A sincronizar…</p>
        ) : agents.length === 0 ? (
          <p className="py-4 text-center text-[11px] leading-relaxed text-muted-foreground">
            Sem agentes <span className="text-muted-foreground/60">.md</span> na pasta.
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-muted-foreground">Nenhum resultado.</p>
        ) : (
          <ul className={compact ? "space-y-1.5" : "space-y-2"}>
            {filtered.map((a, i) => {
              const info = statusMap.get(a.id) ?? { status: "idle" as const, hint: "" };
              const displayName = pickDisplayName(a.id, a.title);
              const accent = readAgentProfile(a.id).accentColor;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelectAgent(a)}
                    className={`group w-full rounded-xl border border-border bg-card/80 text-left shadow-sm transition-all hover:border-primary/35 hover:bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${compact ? "p-2" : "p-2.5"}`}
                    style={
                      accent
                        ? {
                            borderColor: `${accent}55`,
                            boxShadow: `inset 0 0 0 1px ${accent}22`,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-start gap-2">
                      <AgentCharAvatar agentId={a.id} index={i} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate font-mono text-xs font-semibold text-foreground">
                            {displayName}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            {info.status === "working" ? (
                              <Cog className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                            ) : info.status === "thinking" ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                            ) : (
                              <Coffee className="h-3.5 w-3.5 text-amber-200/70" aria-hidden />
                            )}
                          </span>
                        </div>
                        <p
                          className={`mt-0.5 text-[10px] uppercase tracking-wide ${
                            info.status === "working"
                              ? "text-emerald-400"
                              : info.status === "thinking"
                                ? "text-amber-400"
                                : "text-amber-200/70"
                          }`}
                        >
                          [{statusLabelPt(info.status)}]
                        </p>
                        {info.hint ? (
                          <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                            {info.hint}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
