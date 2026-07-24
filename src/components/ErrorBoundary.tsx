import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence. A crash here would otherwise leave a white page with an
 * unsaved invoice behind it, so the fallback tells people their draft is safe
 * and gives them one button that actually fixes things.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry: this app never phones home. The console is the whole story.
    console.error('Ledger crashed', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-6">
        <div className="w-full max-w-md rounded-2xl bg-surface p-8 text-center shadow-pop ring-1 ring-hairline">
          <h1 className="text-lg font-bold tracking-[-0.015em] text-fg">Ledger stopped responding</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Something in the editor threw an error. Your draft is still saved in this browser, so
            reloading should bring it back exactly as it was.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-xl bg-sunken p-3 text-left font-mono text-2xs text-faint">
            {error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="grad-brand mt-5 inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reload Ledger
          </button>
        </div>
      </div>
    );
  }
}
