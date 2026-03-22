/**
 * @file TierGrid.tsx
 * @description Renders the grid of items within a tier.
 * Handles performance for large tiers via virtualization.
 */

import { memo, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CARD_ANIMATION_TRANSITION, CARD_ANIMATION_VARIANTS } from '@/core/ui/animations';
import { Item } from '@/domain/items/items';
import { ItemCard } from '@/features/items/ItemCard';

import { VirtualGrid } from './VirtualGrid';

/**
 * Props for the TierGrid component.
 */
interface TierGridProps {
  /** List of items in this tier. */
  items: Item[];
  /** The ID of the tier. */
  tierId: string;
  /** Callback to remove an item. */
  onRemoveItem: (itemId: string) => void;
  /** Callback to show item details. */
  onInfo?: (item: Item) => void;
  /** Whether the board is completely empty. */
  isBoardEmpty?: boolean;
  /** Whether this is a central/middle tier for empty state display. */
  isMiddleTier?: boolean;
  /** Whether the component is being rendered for image export. */
  isExport?: boolean;
}

/**
 * A responsive grid component for displaying items within a tier row.
 * @param props - The component props.
 * @returns The rendered TierGrid component.
 */
export const TierGrid = memo(function TierGrid({
  items,
  tierId,
  onRemoveItem,
  onInfo,
  isBoardEmpty,
  isMiddleTier,
  isExport = false,
}: TierGridProps) {
  // Use virtualization for very large tiers (e.g. > 100 items)
  const isLargeTier = !isExport && items.length > 100;

  const renderCard = (item: Item): ReactNode => {
    return (
      <ItemCard
        key={item.id}
        item={item}
        tierId={tierId}
        onRemove={onRemoveItem}
        onInfo={onInfo}
        isExport={isExport}
      />
    );
  };

  const cards = items.map((item) => (
    <motion.div
      key={item.id}
      layout
      variants={isExport ? undefined : CARD_ANIMATION_VARIANTS}
      initial={isExport ? undefined : 'initial'}
      animate={isExport ? undefined : 'animate'}
      exit={isExport ? undefined : 'exit'}
      transition={CARD_ANIMATION_TRANSITION}
      className="inline-block"
    >
      {renderCard(item)}
    </motion.div>
  ));

  const content = isLargeTier ? (
    <VirtualGrid items={items} className="max-h-[500px] p-3" renderItem={renderCard} />
  ) : (
    <AnimatePresence>
      {cards}
    </AnimatePresence>
  );

  return (
    <div className={`flex-1 ${!isLargeTier ? 'flex flex-wrap items-center p-2' : ''}`}>
      {isExport ? <>{cards}</> : content}

      {items.length === 0 && isBoardEmpty && isMiddleTier && (
        <div className="text-muted pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-bold italic select-none">
          Drop items here...
        </div>
      )}
    </div>
  );
});
