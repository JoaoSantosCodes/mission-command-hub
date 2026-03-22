import { AnimatePresence, motion } from "framer-motion";
import type { AioxInfo } from "@/types/hub";
import { POLL_INTERVAL_MS } from "@/constants";
import { AioxCliPanel } from "@/components/AioxCliPanel";

type MainWorkspaceProps = {
  info: AioxInfo | null;
  agentsCount: number;
  timeLabel: string;
  onRefresh: () => void;
};

export function MainWorkspace({ info, agentsCount, timeLabel, onRefresh }: MainWorkspaceProps) {
  const docsUrl = import.meta.env.VITE_AIOX_DOCS_URL?.trim();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-4 pb-0 pt-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Área de trabalho</h2>
        <p className="pb-3 text-[11px] text-muted-foreground">
          A CLI no repositório aiox-core é a fonte de verdade — este hub lista agentes no disco e regista comandos.
        </p>
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
            className="h-full overflow-y-auto scrollbar-thin p-4"
          >
            <div className="mx-auto max-w-3xl space-y-4 rounded-lg border border-border bg-card/40 p-4">
              <h3 className="text-sm font-medium text-foreground">Estado da ponte</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <span className="text-foreground">Versão CLI:</span>{" "}
                  <span className="font-mono text-[11px]">{info?.version ?? info?.versionError ?? "—"}</span>
                </li>
                <li>
                  <span className="text-foreground">Agentes (.md):</span> {agentsCount}
                </li>
                <li>
                  <span className="text-foreground">Pasta:</span>{" "}
                  <span className="break-all font-mono text-[10px]">{info?.agentsDir ?? "—"}</span>
                </li>
                <li>
                  <span className="text-foreground">Erro agentes:</span> {info?.agentsError ?? "—"}
                </li>
                <li>
                  <span className="text-foreground">Última sincronização:</span> {timeLabel}
                </li>
                <li>
                  <span className="text-foreground">Polling (separador visível):</span>{" "}
                  <span className="font-mono text-[10px]">{Math.round(POLL_INTERVAL_MS / 1000)}s</span>
                </li>
                <li>
                  <span className="text-foreground">Feed de atividade:</span>{" "}
                  <span className="font-mono text-[10px]">
                    {info?.activityBackend === "postgres"
                      ? "PostgreSQL"
                      : info?.activityBackend === "file"
                        ? "Ficheiro JSON"
                        : "—"}
                  </span>
                </li>
              </ul>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                No repositório <code className="rounded bg-muted px-1 font-mono text-[10px]">aiox-core</code>:{" "}
                <code className="rounded bg-muted px-1 font-mono text-[10px]">npx aiox-core doctor</code>
              </p>
              <p className="text-[11px] text-muted-foreground">
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
                    define <span className="font-mono">VITE_AIOX_DOCS_URL</span> no <span className="font-mono">.env</span>{" "}
                    (ex.: README ou pasta docs do aiox-core).
                  </span>
                )}
              </p>
              {info?.aioxExecAvailable ? <AioxCliPanel onRan={onRefresh} /> : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
