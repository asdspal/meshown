"use client";

/**
 * Generic loading skeleton with Tailwind pulse animation.
 *
 * Renders configurable rows of animated placeholder blocks that indicate
 * content is loading. Used across data-fetching pages for a polished UX.
 *
 * [GAP] Blueprint §7 Phase 5 mentions loading skeletons but does not define
 * a specific component. This uses standard Tailwind animate-pulse pattern.
 */

interface LoadingSkeletonProps {
  /** Number of skeleton rows to render (default 3) */
  rows?: number;
  /** Optional heading text shown above skeletons */
  title?: string;
  /** Variant: "card" renders rounded cards, "table" renders table-like rows */
  variant?: "card" | "table" | "list";
  /** Additional CSS classes for the outer container */
  className?: string;
}

export default function LoadingSkeleton({
  rows = 3,
  title,
  variant = "card",
  className = "",
}: LoadingSkeletonProps) {
  return (
    <div className={className}>
      {title && (
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-zinc-800" />
      )}

      {variant === "card" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
            >
              <div className="mb-3 h-4 w-24 rounded bg-zinc-800" />
              <div className="mb-2 h-8 w-16 rounded bg-zinc-800" />
              <div className="h-3 w-32 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      )}

      {variant === "table" && (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {/* Table header skeleton */}
          <div className="flex gap-4 border-b border-zinc-800 bg-zinc-900/80 p-4">
            {[24, 32, 20, 16, 20].map((w, i) => (
              <div
                key={i}
                className={`h-3 w-${w} animate-pulse rounded bg-zinc-700`}
              />
            ))}
          </div>
          {/* Table row skeletons */}
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 border-b border-zinc-800/50 p-4 last:border-b-0"
            >
              {[20, 28, 16, 12, 16].map((w, j) => (
                <div
                  key={j}
                  className="h-3 animate-pulse rounded bg-zinc-800"
                  style={{ width: `${w * 4}px` }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {variant === "list" && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
            >
              <div className="mb-2 flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-zinc-800" />
                <div className="h-4 w-32 rounded bg-zinc-800" />
                <div className="ml-auto h-5 w-16 rounded-full bg-zinc-800" />
              </div>
              <div className="mb-2 h-3 w-full rounded bg-zinc-800" />
              <div className="h-3 w-3/4 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
