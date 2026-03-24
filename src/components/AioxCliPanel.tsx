import { useState } from 'react';
import { Check, Copy, Loader2, Play, Terminal } from 'lucide-react';

import { postAioxExec } from '@/lib/api';

type AioxCliPanelProps = {
  onRan: () => void;
};

export function AioxCliPanel({ onRan }: AioxCliPanelProps) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<{ sub: string; exitCode: number | null; text: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const run = async (sub: 'doctor' | 'info') => {
    if (!confirm.trim() || busy) return;
    setBusy(true);
    setErr(null);
    setOut(null);
    setCopied(false);
    try {
      const r = await postAioxExec(sub, confirm.trim());
      const text = [
        r.stdout && `--- stdout ---\n${r.stdout}`,
        r.stderr && `--- stderr ---\n${r.stderr}`,
      ]
        .filter(Boolean)
        .join('\n\n');
      setOut({ sub, exitCode: r.exitCode, text: text || '(sem saída)' });
      setConfirm('');
      onRan();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const copyOut = async () => {
    if (!out?.text) return;
    try {
      await navigator.clipboard.writeText(out.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr('Não foi possível copiar para a área de transferência.');
    }
  };

  return (
    <div className="rounded-lg border border-border border-dashed bg-muted/30 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Terminal className="h-3.5 w-3.5" aria-hidden />
        CLI aiox-core (opcional)
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
        Executa <span className="font-mono">aiox doctor</span> ou{' '}
        <span className="font-mono">aiox info</span> no repositório configurado. Requer{' '}
        <span className="font-mono">ENABLE_AIOX_CLI_EXEC</span> e o mesmo segredo em{' '}
        <span className="font-mono">AIOX_EXEC_SECRET</span> no servidor.
      </p>
      <label className="sr-only" htmlFor="aiox-exec-secret">
        Segredo de confirmação
      </label>
      <input
        id="aiox-exec-secret"
        type="password"
        autoComplete="off"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Segredo (AIOX_EXEC_SECRET)"
        className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !confirm.trim()}
          onClick={() => void run('doctor')}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <Play className="h-3 w-3" aria-hidden />
          )}
          doctor
        </button>
        <button
          type="button"
          disabled={busy || !confirm.trim()}
          onClick={() => void run('info')}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <Play className="h-3 w-3" aria-hidden />
          )}
          info
        </button>
      </div>
      {err ? (
        <p className="mt-3 text-[11px] text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      {out ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">
              exit {out.exitCode} · {out.sub}
            </span>
            <button
              type="button"
              onClick={() => void copyOut()}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {copied ? (
                <Check className="h-3 w-3 text-accent" aria-hidden />
              ) : (
                <Copy className="h-3 w-3" aria-hidden />
              )}
              {copied ? 'Copiado' : 'Copiar saída'}
            </button>
          </div>
          <pre className="max-h-48 overflow-auto rounded-md border border-border bg-background/80 p-2 font-mono text-[10px] leading-relaxed text-foreground">
            {out.text}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
