import { Skeleton, SkeletonText } from "@/components/ui";

/**
 * Shown while a lazily-loaded route chunk is fetched. It mirrors the common page shape (a title
 * line plus a block of content) so the layout does not jump when the real page arrives. Route
 * chunks are served from the same origin, so this is usually on screen only for a frame or two.
 */
export function RouteFallback() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-48" />
      <SkeletonText lines={4} />
    </div>
  );
}
