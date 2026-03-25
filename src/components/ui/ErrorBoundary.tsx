import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-destructive"
      >
        <span className="font-medium">Erro inesperado</span>
        {this.state.message ? (
          <span className="font-mono text-xs text-muted-foreground">{this.state.message}</span>
        ) : null}
        <button
          type="button"
          className="mt-2 rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-accent/20"
          onClick={() => this.setState({ hasError: false, message: '' })}
        >
          Tentar novamente
        </button>
      </div>
    );
  }
}
