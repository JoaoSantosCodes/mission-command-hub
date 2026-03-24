import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  FolderOpen,
  Layers,
  RefreshCw,
  Sparkles,
  Terminal,
  Timer,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { AioxInfo } from "@/types/hub";
import { POLL_INTERVAL_MS } from "@/constants";
import { AioxCliPanel } from "@/components/AioxCliPanel";

type MainWorkspaceProps = {
  info: AioxInfo | null;
  agentsCount: number;
  timeLabel: string;
  onRefresh: () => void;
  helpVisible: boolean;
  onHelpVisibleChange: (next: boolean) => void;
};

function StatTile({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/80 bg-background/50 p-3 shadow-sm shadow-black/[0.03] dark:shadow-black/20">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 ring-1 ring-primary/20"
        aria-hidden
      >
        <Icon className="h-[18px] w-[18px] text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="mt-1 text-sm leading-snug text-foreground">{children}</div>
      </div>
    </div>
  );
}

export function MainWorkspace({ info, agentsCount, timeLabel, onRefresh, helpVisible, onHelpVisibleChange }: MainWorkspaceProps) {
  const docsUrl = import.meta.env.VITE_AIOX_DOCS_URL?.trim();
  const agentsErr = info?.agentsError?.trim();
  const bridgeHealthy = Boolean(info?.aioxExists !== false && !agentsErr);
  const versionLine = info?.version ?? info?.versionError ?? "—";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-card/30 px-4 pb-3 pt-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
            <Layers className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Área de trabalho</h2>
            <p className="mt-1 max-w-prose text-[12px] leading-relaxed text-muted-foreground">
              A CLI no repositório <span className="font-mono text-foreground/90">aiox-core</span> é a fonte de verdade —
              este hub lista agentes no disco e regista comandos no feed.
            </p>
          </div>
        </div>
      </div>
      <main
        id="conteudo-principal"
        tabIndex={-1}
        className="relative min-h-0 flex-1 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="h-full overflow-y-auto scrollbar-thin p-4 sm:p-5"
          >
            <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/[0.04] ring-1 ring-border/60 dark:bg-card/90 dark:shadow-black/30">
              {/* Cabeçalho do card — separado do corpo */}
              <div className="border-b border-border bg-gradient-to-br from-primary/[0.12] via-card to-card px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/90">Monitorização</p>
                    <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground">Estado da ponte</h3>
                    {helpVisible ? (
                      <p className="mt-1 max-w-xl text-[11px] text-muted-foreground">
                        Ligação ao disco e à API local; actualiza quando sincronizas ou envias comandos.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        bridgeHealthy
                          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {bridgeHealthy ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      )}
                      {bridgeHealthy ? "Ponte OK" : "Rever configuração"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRefresh()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary"
                      title="Pedir estado actualizado ao servidor"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      Sincronizar
                    </button>
                    <button
                      type="button"
                      onClick={() => onHelpVisibleChange(!helpVisible)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      title="Mostrar/ocultar dicas desta área"
                    >
                      {helpVisible ? "Ocultar dicas" : "Mostrar dicas"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatTile icon={Terminal} label="Versão CLI">
                    <span className="font-mono text-[13px] text-primary">{versionLine}</span>
                  </StatTile>
                  <StatTile icon={Sparkles} label="Agentes (.md)">
                    <span className="tabular-nums">{agentsCount}</span>
                  </StatTile>
                  <StatTile icon={FolderOpen} label="Pasta de agentes">
                    <span
                      className="break-all font-mono text-[11px] leading-snug text-muted-foreground"
                      title="Raiz AIOX: contém .aiox-core. A lista de agentes segue agents_dir nos YAML (framework -> project -> local)."
                    >
                      {info?.agentsDir ?? "—"}
                    </span>
                  </StatTile>
                  <StatTile icon={agentsErr ? AlertTriangle : CheckCircle2} label="Leitura no disco">
                    <span className={agentsErr ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {agentsErr || "Sem erros"}
                    </span>
                  </StatTile>
                  <StatTile icon={Clock} label="Última sincronização">
                    <span className="font-mono text-[12px]">{timeLabel}</span>
                  </StatTile>
                  <StatTile icon={Timer} label="Polling (separador visível)">
                    <span className="font-mono text-[12px]">{Math.round(POLL_INTERVAL_MS / 1000)}s</span>
                  </StatTile>
                  <StatTile icon={Database} label="Feed de atividade">
                    <span className="font-mono text-[11px]">
                      {info?.activityBackend === "postgres"
                        ? "PostgreSQL"
                        : info?.activityBackend === "file"
                          ? "Ficheiro JSON"
                          : "—"}
                    </span>
                  </StatTile>
                </div>

                {helpVisible ? (
                  <div className="rounded-xl border border-dashed border-border/80 bg-muted/25 px-4 py-3 dark:bg-muted/15">
                    <div className="flex items-start gap-2">
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <div className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                        <p>
                          Na <strong className="font-medium text-foreground/90">raiz do projeto AIOX</strong> (caminho acima —
                          onde vive <code className="rounded bg-muted px-1 font-mono text-[10px]">.aiox-core</code>) corre{" "}
                          <code className="rounded bg-muted px-1 font-mono text-[10px]">npx aiox-core doctor</code> para
                          diagnóstico.
                        </p>
                        <p>
                          Documentação externa:{" "}
                          {docsUrl ? (
                            <a
                              href={docsUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="font-medium text-primary underline-offset-2 hover:underline"
                            >
                              abrir link
                            </a>
                          ) : (
                            <span className="text-[10px]">
                              define <span className="font-mono">VITE_AIOX_DOCS_URL</span> no{" "}
                              <span className="font-mono">.env</span>.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {info?.aioxExecAvailable ? <AioxCliPanel onRan={onRefresh} /> : null}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
