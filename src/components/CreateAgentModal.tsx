import { useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

import { createAgent } from '@/lib/api';
import { formatUserFacingError } from '@/lib/format-error';

/** Alinhado ao servidor: `resolveAgentMarkdownPath` */
const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

const DEFAULT_TEMPLATE = (id: string) =>
  `# ${id}\n\n---\nname: ${id}\ndescription: ''\nrole: assistant\n---\n\n## Missão\n\n`;

type CreateAgentModalProps = {
  open: boolean;
  onClose: () => void;
  /** Chamado após criação bem-sucedida com o id final */
  onCreated: (id: string) => void;
};

export function CreateAgentModal({ open, onClose, onCreated }: CreateAgentModalProps) {
  const [idDraft, setIdDraft] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const idTrim = idDraft.trim();
  const idValid = idTrim.length > 0 && ID_RE.test(idTrim);

  const submit = async () => {
    if (!idValid || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await createAgent({
        id: idTrim,
        content: useTemplate ? DEFAULT_TEMPLATE(idTrim) : undefined,
      });
      setIdDraft('');
      setUseTemplate(true);
      onCreated(idTrim);
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="create-agent-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl ring-1 ring-primary/10">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Novo agente
            </p>
            <h2 id="create-agent-title" className="mt-0.5 text-base font-semibold text-foreground">
              Criar definição <span className="font-mono text-sm">.md</span>
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              O ficheiro é criado em{' '}
              <span className="font-mono text-foreground/90">.aiox-core/development/agents/</span>{' '}
              no teu aiox-core.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-[11px] font-medium text-muted-foreground">
            Identificador (nome do ficheiro)
            <input
              value={idDraft}
              onChange={(e) => setIdDraft(e.target.value.replace(/\s+/g, '-'))}
              placeholder="ex.: my-agent"
              autoComplete="off"
              spellCheck={false}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          {idTrim && !ID_RE.test(idTrim) ? (
            <p className="text-[11px] text-destructive">
              Usa apenas letras, números, <span className="font-mono">.</span>{' '}
              <span className="font-mono">_</span> <span className="font-mono">-</span> (máx. 128
              caracteres após o primeiro).
            </p>
          ) : null}

          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={useTemplate}
              onChange={(e) => setUseTemplate(e.target.checked)}
              className="rounded border-border"
            />
            Incluir modelo mínimo (título + frontmatter YAML)
          </label>

          {err ? (
            <div
              className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {formatUserFacingError(err)}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!idValid || busy}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : null}
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}
