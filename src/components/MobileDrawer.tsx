import { X } from 'lucide-react';

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  title: string;
  children: React.ReactNode;
};

export function MobileDrawer({ open, onClose, side, title, children }: MobileDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 lg:hidden"
      role="dialog"
      aria-modal
      aria-labelledby="mobile-drawer-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-label="Fechar painel"
        onClick={onClose}
      />
      <div
        className={`absolute top-0 flex h-full w-[min(100vw-2rem,20rem)] flex-col border-border bg-card shadow-2xl ${
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <h2
            id="mobile-drawer-title"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Fechar"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
