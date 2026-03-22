/**
 * @file SkeletonCard.tsx
 * @description A placeholder component displayed while items are loading in the search results.
 * Uses a pulse animation to indicate activity.
 * @module SkeletonCard
 */

import { ITEM_CARD_BASE_CLASSES } from '@/features/items/ItemCard';

/**
 * Renders a rectangular loading skeleton with a pulse animation.
 * Used as a placeholder for MediaCards during asynchronous loading.
 * @returns The rendered SkeletonCard component.
 */
export function SkeletonCard() {
  return (
    <div className={`bg-surface-hover/50 animate-pulse ${ITEM_CARD_BASE_CLASSES}`}>
      <div className="bg-surface-hover h-full w-full"></div>
    </div>
  );
}
