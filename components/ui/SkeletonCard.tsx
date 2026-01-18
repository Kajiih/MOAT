/**
 * @file SkeletonCard.tsx
 * @description A placeholder component displayed while media items are loading in the search results.
 * Uses a pulse animation to indicate activity.
 * @module SkeletonCard
 */

/**
 * Renders a rectangular loading skeleton with a pulse animation.
 * Used as a placeholder for MediaCards during asynchronous loading.
 */
export function SkeletonCard() {
  return (
    <div className="h-24 w-24 animate-pulse overflow-hidden rounded-md bg-neutral-800/50">
      <div className="h-full w-full bg-neutral-800"></div>
    </div>
  );
}
