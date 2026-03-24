import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Eye, EyeOff, RefreshCw, Save, X } from "lucide-react";
import type { IntegrationsConfigPayload } from "@/lib/api";
import type { IntegrationsStatus } from "@/lib/api";

type IntegrationsConfigPanelProps = {
  open: boolean;
  onClose: () => void;
  draft: IntegrationsConfigPayload;
  redacted: Record<string, string>;
  status: IntegrationsStatus | null;
  saving: boolean;
  onChange: (patch: IntegrationsConfigPayload) => void;
  onReload: () => void;
  onValidateNow: () => void;
  helpVisible: boolean;
  onHelpVisibleChange: (next: boolean) => void;
  onSave: () => void;
};

function FieldRow({
  label,
  envKey,
  type = "text",
  value,
  masked,
  onChange,
}: {
  label: string;
  envKey: keyof IntegrationsConfigPayload;
  type?: "text" | "password";
  value?: string;
  masked?: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const inputType = type === "password" ? (show ? "text" : "password") : "text";
  return (
    <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
      <span>
        {label} <span className="font-mono normal-case text-[10px] text-foreground/70">{envKey}</span>
      </span>
      <div className="flex items-center gap-2">
        <input
          type={inputType}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs normal-case text-foreground outline-none focus:border-primary"
          placeholder={masked ? `Atual: ${masked}` : "—"}
          autoComplete="off"
        />
        {type === "password" ? (
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => setShow((v) => !v)}
            title={show ? "Ocultar valor" : "Mostrar valor"}
          >
            {show ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
          </button>
        ) : null}
      </div>
    </label>
  );
}

export function IntegrationsConfigPanel({
  open,
  onClose,
  draft,
  redacted,
  status,
  saving,
  onChange,
  onReload,
  onValidateNow,
  helpVisible,
  onHelpVisibleChange,
  onSave,
}: IntegrationsConfigPanelProps) {
  const [tab, setTab] = useState<"onboarding" | "llm" | "integrations" | "infra">("onboarding");
  useEffect(() => {
    if (!open) return;
    setTab("onboarding");
  }, [open]);
  const ok = {
    llm: status?.doubts?.llmValidated === true || status?.doubts?.openaiValidated === true,
    slack: status?.slack?.mirrorReady === true,
    notion: status?.notion?.tokenValidated === true,
    figma: status?.figma?.tokenValidated === true,
    db: status?.database?.activityBackend === "postgres",
  };
  const doneCount = Object.values(ok).filter(Boolean).length;
  const totalCount = Object.keys(ok).length;
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Fechar" />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/[0.08] ring-1 ring-primary/15">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-br from-primary/[0.1] via-card to-secondary/25 px-4 py-3 sm:px-5">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Configuração</p>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">APIs e Integrações</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Fechar"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 sm:px-5">
          {[
            { id: "onboarding", label: "Onboarding" },
            { id: "llm", label: "LLM" },
            { id: "integrations", label: "Integrações" },
            { id: "infra", label: "Infra" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
                tab === t.id
                  ? "border-primary/35 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onHelpVisibleChange(!helpVisible)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Mostrar/ocultar dicas do painel"
          >
            {helpVisible ? "Ocultar dicas" : "Mostrar dicas"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          {tab === "onboarding" && helpVisible ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background/50 p-3">
                <p className="text-xs font-semibold text-foreground">Wizard de onboarding</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Progresso: <span className="font-mono text-foreground">{doneCount}/{totalCount}</span> integrações validadas.
                </p>
                <button
                  type="button"
                  onClick={onValidateNow}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Validar agora
                </button>
              </div>

              {[
                { key: "llm", title: "1) LLM", hint: "Preenche chave + ativa MISSION_DOUBTS_LLM=1.", pass: ok.llm },
                { key: "slack", title: "2) Slack", hint: "Cola SLACK_WEBHOOK_URL e gera uma atividade.", pass: ok.slack },
                { key: "notion", title: "3) Notion", hint: "Define NOTION_TOKEN e valida permissões.", pass: ok.notion },
                { key: "figma", title: "4) Figma", hint: "Define FIGMA_ACCESS_TOKEN e valida permissões.", pass: ok.figma },
                { key: "db", title: "5) PostgreSQL (opcional)", hint: "Define DATABASE_URL para backend postgres.", pass: ok.db },
              ].map((step) => (
                <div key={step.key} className="rounded-xl border border-border bg-card/70 p-3">
                  <div className="flex items-center gap-2">
                    {step.pass ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                    ) : (
                      <CircleDashed className="h-4 w-4 text-muted-foreground" aria-hidden />
                    )}
                    <p className="text-xs font-medium text-foreground">{step.title}</p>
                    <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {step.pass ? "OK" : "PENDENTE"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{step.hint}</p>
                </div>
              ))}
            </div>
          ) : tab === "onboarding" ? (
            <div className="rounded-xl border border-border bg-background/50 p-3 text-[11px] text-muted-foreground">
              Dicas ocultas. Usa <strong className="font-medium text-foreground">Mostrar dicas</strong> para ver o wizard.
            </div>
          ) : tab === "llm" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow
                label="Chave principal"
                envKey="MISSION_LLM_API_KEY"
                type="password"
                value={draft.MISSION_LLM_API_KEY}
                masked={redacted.MISSION_LLM_API_KEY}
                onChange={(v) => onChange({ MISSION_LLM_API_KEY: v })}
              />
              <FieldRow
                label="Chave legacy"
                envKey="OPENAI_API_KEY"
                type="password"
                value={draft.OPENAI_API_KEY}
                masked={redacted.OPENAI_API_KEY}
                onChange={(v) => onChange({ OPENAI_API_KEY: v })}
              />
              <FieldRow
                label="Base URL"
                envKey="MISSION_LLM_BASE_URL"
                value={draft.MISSION_LLM_BASE_URL}
                masked={redacted.MISSION_LLM_BASE_URL}
                onChange={(v) => onChange({ MISSION_LLM_BASE_URL: v })}
              />
              <FieldRow
                label="Modelo"
                envKey="MISSION_LLM_MODEL"
                value={draft.MISSION_LLM_MODEL}
                masked={redacted.MISSION_LLM_MODEL}
                onChange={(v) => onChange({ MISSION_LLM_MODEL: v })}
              />
              <FieldRow
                label="Ativar dúvidas LLM (1/0)"
                envKey="MISSION_DOUBTS_LLM"
                value={draft.MISSION_DOUBTS_LLM}
                masked={redacted.MISSION_DOUBTS_LLM}
                onChange={(v) => onChange({ MISSION_DOUBTS_LLM: v })}
              />
            </div>
          ) : tab === "integrations" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow
                label="Slack Webhook"
                envKey="SLACK_WEBHOOK_URL"
                type="password"
                value={draft.SLACK_WEBHOOK_URL}
                masked={redacted.SLACK_WEBHOOK_URL}
                onChange={(v) => onChange({ SLACK_WEBHOOK_URL: v })}
              />
              <FieldRow
                label="Notion Token"
                envKey="NOTION_TOKEN"
                type="password"
                value={draft.NOTION_TOKEN}
                masked={redacted.NOTION_TOKEN}
                onChange={(v) => onChange({ NOTION_TOKEN: v })}
              />
              <FieldRow
                label="Figma Access Token"
                envKey="FIGMA_ACCESS_TOKEN"
                type="password"
                value={draft.FIGMA_ACCESS_TOKEN}
                masked={redacted.FIGMA_ACCESS_TOKEN}
                onChange={(v) => onChange({ FIGMA_ACCESS_TOKEN: v })}
              />
              <FieldRow
                label="Slack ingest secret (entrada)"
                envKey="SLACK_TASK_INGEST_SECRET"
                type="password"
                value={draft.SLACK_TASK_INGEST_SECRET}
                masked={redacted.SLACK_TASK_INGEST_SECRET}
                onChange={(v) => onChange({ SLACK_TASK_INGEST_SECRET: v })}
              />
              <FieldRow
                label="Agente padrão (Slack->Backlog)"
                envKey="SLACK_TASK_DEFAULT_ASSIGNEE"
                value={draft.SLACK_TASK_DEFAULT_ASSIGNEE}
                masked={redacted.SLACK_TASK_DEFAULT_ASSIGNEE}
                onChange={(v) => onChange({ SLACK_TASK_DEFAULT_ASSIGNEE: v })}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow
                label="Database URL"
                envKey="DATABASE_URL"
                type="password"
                value={draft.DATABASE_URL}
                masked={redacted.DATABASE_URL}
                onChange={(v) => onChange({ DATABASE_URL: v })}
              />
              <FieldRow
                label="Ativar CLI exec (1/0)"
                envKey="ENABLE_AIOX_CLI_EXEC"
                value={draft.ENABLE_AIOX_CLI_EXEC}
                masked={redacted.ENABLE_AIOX_CLI_EXEC}
                onChange={(v) => onChange({ ENABLE_AIOX_CLI_EXEC: v })}
              />
              <FieldRow
                label="Segredo exec"
                envKey="AIOX_EXEC_SECRET"
                type="password"
                value={draft.AIOX_EXEC_SECRET}
                masked={redacted.AIOX_EXEC_SECRET}
                onChange={(v) => onChange({ AIOX_EXEC_SECRET: v })}
              />
            </div>
          )}
          {helpVisible ? (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Guardar aplica no processo atual do servidor e persiste em ficheiro de configuração do MissionAgent.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onValidateNow}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Validar integrações
          </button>
          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Recarregar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {saving ? "A guardar..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
