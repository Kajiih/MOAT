/**
 * @file TierGrid.tsx
 * @description Renders the grid of items within a tier.
 * Handles performance for large tiers via virtualization.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { memo, ReactNode } from 'react';

import {
  CARD_ANIMATION_HOVER,
  CARD_ANIMATION_TAP,
  CARD_ANIMATION_TRANSITION,
} from '@/core/ui/animations';
import { DropIndicator } from '@/core/ui/DropIndicator';
import { Item } from '@/domain/items/items';
import { useTierListContext } from '@/features/board/context';
import { EPIC_ANIMATION_PRESETS } from '@/features/items/animations/registry';
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
  /** Whether a drag is currently over the empty space of this grid. */
  isOverEmpty?: boolean;
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
  isOverEmpty = false,
}: TierGridProps) {
  const context = useTierListContext();
  const activeEpic = context?.ui.activeEpic;
  const activePreset = activeEpic
    ? EPIC_ANIMATION_PRESETS[activeEpic.animationId]
    : EPIC_ANIMATION_PRESETS.default;

  // Use virtualization for very large tiers (e.g. > 100 items)
  const isLargeTier = !isExport && items.length > 100;

  const renderCard = (item: Item): ReactNode => {
    const isLastItem = items.length > 0 && item.id === items.at(-1)?.id;
    return (
      <ItemCard
        key={item.id}
        item={item}
        tierId={tierId}
        onRemove={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
        onInfo={onInfo}
        isExport={isExport}
        overrideClosestEdge={isOverEmpty && isLastItem ? 'right' : null}
      />
    );
  };

  const cards = items.map((item) => {
    const isEpicCard = activeEpic?.itemId === item.id;
    const variants = isEpicCard
      ? activePreset.cardVariants
      : EPIC_ANIMATION_PRESETS.default.cardVariants;

    return (
      <motion.div
        key={item.id}
        layout
        variants={isExport ? undefined : variants}
        initial={isExport ? undefined : 'initial'}
        animate={isExport ? undefined : 'animate'}
        exit={isExport ? undefined : 'exit'}
        whileHover={isExport ? undefined : CARD_ANIMATION_HOVER}
        whileTap={isExport ? undefined : CARD_ANIMATION_TAP}
        transition={CARD_ANIMATION_TRANSITION}
        className="inline-block"
      >
        {renderCard(item)}
      </motion.div>
    );
  });

  const content = isLargeTier ? (
    <VirtualGrid items={items} className="max-h-[500px] p-3" renderItem={renderCard} />
  ) : (
    <AnimatePresence>{cards}</AnimatePresence>
  );

  return (
    <div className={`relative flex-1 ${!isLargeTier ? 'flex flex-wrap items-center p-2' : ''}`}>
      {isExport ? <>{cards}</> : content}
      {items.length === 0 && isOverEmpty && (
        <DropIndicator className="absolute top-2 bottom-2 left-2" />
      )}

      {items.length === 0 && isBoardEmpty && isMiddleTier && (
        <div className="text-muted pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-bold italic select-none">
          Drop items here...
        </div>
      )}
    </div>
  );
});
