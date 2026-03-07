/**
 * @file SkeletonCard.tsx
 * @description A placeholder component displayed while media items are loading in the search results.
 * Uses a pulse animation to indicate activity.
 * @module SkeletonCard
 */

import { ITEM_CARD_BASE_CLASSES } from '@/components/media/ItemCard';

/**
 * Renders a rectangular loading skeleton with a pulse animation.
 * Used as a placeholder for MediaCards during asynchronous loading.
 * @returns The rendered SkeletonCard component.
 */
export function SkeletonCard() {
  return (
    <div className={`animate-pulse bg-neutral-800/50 ${ITEM_CARD_BASE_CLASSES}`}>
      <div className="h-full w-full bg-neutral-800"></div>
    </div>
  );
}
