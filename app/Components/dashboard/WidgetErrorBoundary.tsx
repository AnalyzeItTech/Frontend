'use client';

import React from 'react';

interface Props {
  title?: string;
  children: React.ReactNode;
  /** Fires once per crash so the host can log it. */
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
  attempt: number;
}

/**
 * Isolates a single widget: a malformed spec (common with LLM-generated data) shows a small
 * error card with Retry instead of unmounting the whole canvas.
 */
export class WidgetErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
    console.warn('Widget failed to render:', this.props.title, error);
  }

  render() {
    if (!this.state.error) {
      return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
    }
    return (
      <div role="alert" className="rounded-2xl border border-dashed border-red-400/60 bg-red-500/5 p-4 flex flex-col gap-2 min-h-[120px] justify-center">
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">{this.props.title ? `“${this.props.title}” couldn’t be displayed` : 'This widget couldn’t be displayed'}</p>
        <p className="text-[11px] text-[var(--text-muted,#91867E)]">Its data may be malformed. The rest of the dashboard is unaffected.</p>
        <div>
          <button
            type="button"
            onClick={() => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))}
            className="px-2.5 py-1 text-xs rounded-lg border border-red-400/50 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}
