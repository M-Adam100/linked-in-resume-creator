import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
  /** Shown above the reset button, e.g. "the editor". */
  area?: string;
}

interface State {
  error: Error | null;
}

/**
 * A render crash must not leave the user staring at a blank extension page,
 * and their resume is already persisted, so recovery is just a remount.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('Unhandled UI error', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[220px] items-center justify-center p-6">
        <div className="card w-full max-w-md p-5">
          <h2 className="text-sm font-semibold text-zinc-900">
            Something went wrong in {this.props.area ?? 'ResumeForge'}
          </h2>
          <p className="mt-1.5 text-[13px] text-zinc-600">
            Your resume is saved locally, so nothing was lost. Try again, or
            reload the page if the problem repeats.
          </p>
          <pre className="mt-3 max-h-24 overflow-auto rounded-lg bg-zinc-50 p-2 text-[11px] text-zinc-500">
            {error.message}
          </pre>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={this.handleReset}
            >
              Try again
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={this.handleReload}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
