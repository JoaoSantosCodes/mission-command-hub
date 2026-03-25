/**
 * Cronômetro do CEO — mostra contagem regressiva até ao próximo auto-run sweep.
 * Aparece apenas quando `autoRunEnabled = true` (MISSION_TASK_AUTORUN=1).
 *
 * O servidor varre as tasks em `todo` com `assigneeAgentId` a cada `pollMs` ms
 * (padrão 5500 ms, configurável via MISSION_TASK_AUTORUN_POLL_MS).
 * Este componente expõe esse ciclo ao utilizador de forma visual.
 */
import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import { getTaskRuns } from '@/lib/api';

type Phase = 'loading' | 'disabled' | 'idle' | 'active';

export function AutoRunCountdown() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [pollMs, setPollMs] = useState(5500);
  const [remainingMs, setRemainingMs] = useState(5500);
  /** Momento em que o atual ciclo começou (para calcular restante). */
  const cycleStartRef = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);

  // Carrega configuração do servidor uma única vez
  useEffect(() => {
    let cancelled = false;
    getTaskRuns()
      .then(({ autoRunEnabled, pollMs: ms }) => {
        if (cancelled) return;
        if (!autoRunEnabled) {
          setPhase('disabled');
          return;
        }
        setPollMs(ms);
        setRemainingMs(ms);
        cycleStartRef.current = Date.now();
        setPhase('idle');
      })
      .catch(() => {
        if (!cancelled) setPhase('disabled');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Loop RAF para actualizar o contador
  useEffect(() => {
    if (phase === 'loading' || phase === 'disabled') return;

    function tick() {
      const elapsed = Date.now() - cycleStartRef.current;
      const rem = Math.max(0, pollMs - elapsed);
      setRemainingMs(rem);

      if (rem === 0) {
        // Ciclo completo → reset
        cycleStartRef.current = Date.now();
        setPhase('active'); // brevemente "ativo"
        setTimeout(() => setPhase('idle'), 600);
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, pollMs]);

  // Reset do ciclo ao receber evento de task-run (sweep disparou)
  useEffect(() => {
    const handler = () => {
      cycleStartRef.current = Date.now();
      setRemainingMs(pollMs);
      setPhase('active');
      setTimeout(() => setPhase('idle'), 800);
    };
    window.addEventListener('mission-team-activity', handler);
    return () => window.removeEventListener('mission-team-activity', handler);
  }, [pollMs]);

  if (phase === 'loading' || phase === 'disabled') return null;

  const secs = (remainingMs / 1000).toFixed(1);
  const pct = remainingMs / pollMs; // 1.0 → 0.0
  const isActive = phase === 'active';

  return (
    <div
      className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium sm:flex transition-all duration-300 ${
        isActive
          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
          : 'border-border bg-secondary/30 text-muted-foreground'
      }`}
      title={`Auto-run sweep a cada ${(pollMs / 1000).toFixed(1)}s — próximo em ${secs}s\nMISSION_TASK_AUTORUN_POLL_MS=${pollMs}`}
    >
      <Timer className={`h-3 w-3 shrink-0 ${isActive ? 'animate-pulse' : ''}`} aria-hidden />
      <span className="font-mono leading-none">
        {isActive ? 'sweep!' : `${secs}s`}
      </span>
      {/* Barra de progresso minimalista */}
      <span className="relative hidden h-1 w-8 overflow-hidden rounded-full bg-border sm:block">
        <span
          className={`absolute left-0 top-0 h-full rounded-full transition-none ${
            isActive ? 'bg-emerald-500' : 'bg-primary/60'
          }`}
          style={{ width: `${(1 - pct) * 100}%` }}
        />
      </span>
    </div>
  );
}
