/**
 * @file SkeletonCard.tsx
 * @description A placeholder component displayed while media items are loading in the search results.
 * Uses a pulse animation to indicate activity.
 * @module SkeletonCard
 */

export function SkeletonCard() {
  return (
    <div className="w-24 h-24 bg-neutral-800/50 rounded-md overflow-hidden animate-pulse">
      <div className="h-full w-full bg-neutral-800"></div>
    </div>
  );
}
