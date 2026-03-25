import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, CheckCircle2, LayoutGrid, Terminal, X } from 'lucide-react';

export const ONBOARDING_DONE_KEY = 'mission-onboarding-done';

const STEPS = [
  {
    icon: <Bot className="h-8 w-8 text-primary" aria-hidden />,
    title: 'Bem-vindo ao MissionAgent',
    body: 'O teu hub de orquestração para gerir agentes de IA, tarefas e missões — tudo num só lugar. Vamos fazer uma visita rápida em 4 passos.',
  },
  {
    icon: <Bot className="h-8 w-8 text-emerald-500" aria-hidden />,
    title: 'Os teus agentes',
    body: 'O painel lateral esquerdo lista todos os agentes carregados a partir dos ficheiros .md. Clica em qualquer agente para ver detalhes, editar o perfil ou iniciar um passo de execução.',
  },
  {
    icon: <LayoutGrid className="h-8 w-8 text-violet-500" aria-hidden />,
    title: 'Canvas de tarefas',
    body: 'Usa a vista "Tarefas" (Alt+3) para gerir o backlog em colunas Kanban. Arrasta cartões entre colunas, atribui agentes e exporta o board em JSON ou CSV.',
  },
  {
    icon: <Terminal className="h-8 w-8 text-orange-500" aria-hidden />,
    title: 'Comandos globais',
    body: (
      <ul className="mt-2 space-y-1.5 text-left text-[12px]">
        <li><kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Alt+1/2/3/4</kbd> — mudar de vista</li>
        <li><kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Ctrl+K</kbd> — focar o campo de comando</li>
        <li><kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Ctrl+/</kbd> — abrir painel de dúvidas IA</li>
        <li><kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd> — fechar modais / painéis</li>
      </ul>
    ),
  },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

function markDone(onClose: () => void) {
  try {
    localStorage.setItem(ONBOARDING_DONE_KEY, '1');
  } catch {
    /* ignore */
  }
  onClose();
}

export function OnboardingModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step]!;

  const handleClose = () => markDone(onClose);

  const handleNext = () => {
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="onboarding-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          aria-modal="true"
          role="dialog"
          aria-label="Onboarding — bem-vindo ao MissionAgent"
        >
          <motion.div
            key="onboarding-card"
            className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Saltar onboarding"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>

            {/* Step dots */}
            <div className="mb-5 flex justify-center gap-1.5" aria-label={`Passo ${step + 1} de ${total}`}>
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`}
                />
              ))}
            </div>

            {/* Step content with slide animation */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                className="flex flex-col items-center text-center"
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/50 ring-1 ring-border">
                  {current.icon}
                </div>
                <h2 className="text-base font-semibold text-foreground">{current.title}</h2>
                <div className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {current.body}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                Anterior
              </button>
              <span className="text-[11px] text-muted-foreground/60">
                {step + 1} / {total}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {step === total - 1 ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Concluir
                  </>
                ) : (
                  'Próximo'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
