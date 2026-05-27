"use client";

import React from "react";

/**
 * Generic React Error Boundary (class component — React has no hook-based equivalent).
 *
 * Catches uncaught rendering errors in its children and displays a fallback UI
 * instead of crashing the entire app. Provides a "Try Again" button that resets
 * the error state to re-render children.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponentThatMightThrow />
 *   </ErrorBoundary>
 *
 * [GAP] Blueprint §7 Phase 5 mentions error boundaries but does not define
 * a specific component. This is a standard React pattern.
 */

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback UI. If omitted, a default error card is shown. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console in development; in production this could be sent to
    // an error reporting service (Sentry, etc.)
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-red-500/30 bg-zinc-900/90 p-6 text-center shadow-2xl backdrop-blur-md">
            {/* Error icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
              <svg
                className="h-7 w-7 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>

            <h3 className="mb-2 text-lg font-semibold text-white">
              Something went wrong
            </h3>
            <p className="mb-1 text-sm text-zinc-400">
              An unexpected error occurred while rendering this section.
            </p>
            {this.state.error && (
              <p className="mb-4 max-h-20 overflow-auto rounded-lg bg-zinc-800/50 p-2 text-xs font-mono text-red-300">
                {this.state.error.message}
              </p>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
