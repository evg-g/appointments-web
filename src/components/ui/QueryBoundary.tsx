import type { ReactNode } from "react";

import { errorMessage } from "@/api/errors";

import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { SkeletonText } from "./Skeleton";

/**
 * The subset of a TanStack Query result this component needs. Kept structural (not the full
 * UseQueryResult) so it is trivial to drive from a test without a QueryClient.
 */
export interface QueryLike<T> {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  isFetching?: boolean;
  refetch?: () => unknown;
}

export interface QueryBoundaryProps<T> {
  query: QueryLike<T>;
  /** Render the loaded, non-empty data. */
  children: (data: T) => ReactNode;
  /** Custom loading UI (defaults to a skeleton). */
  loading?: ReactNode;
  /** Custom empty UI (defaults to an EmptyState). */
  empty?: ReactNode;
  /** Decide whether loaded data counts as empty (e.g. `(d) => d.length === 0`). */
  isEmpty?: (data: T) => boolean;
  errorTitle?: string;
}

/**
 * Renders exactly one of the four designed async states — loading, error, empty, success — from a
 * query result, so no screen has to re-implement (or forget) any of them. This is the contract the
 * UI quality bar asks for: no async surface without all four states.
 */
export function QueryBoundary<T>({
  query,
  children,
  loading,
  empty,
  isEmpty,
  errorTitle,
}: QueryBoundaryProps<T>) {
  if (query.isPending) {
    return (
      loading ?? (
        <div role="status" aria-live="polite">
          <span className="sr-only">Loading…</span>
          <SkeletonText lines={4} />
        </div>
      )
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        {...(errorTitle !== undefined ? { title: errorTitle } : {})}
        message={errorMessage(query.error)}
        {...(query.refetch !== undefined ? { onRetry: () => query.refetch?.() } : {})}
        retrying={query.isFetching ?? false}
      />
    );
  }

  // Not pending and not error, but data can still be undefined in edge cases — treat as empty.
  if (query.data === undefined || (isEmpty !== undefined && isEmpty(query.data))) {
    return empty ?? <EmptyState title="Nothing here yet" description="There is no data to show." />;
  }

  return <>{children(query.data)}</>;
}
