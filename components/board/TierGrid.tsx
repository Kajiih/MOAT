/**
 * @file TierGrid.tsx
 * @description Renders the grid of items within a tier.
 * Automatically switches between LegacyMediaCard and the new standard MediaCard.
 * Handles performance for large tiers via virtualization.
 */

import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { memo, ReactNode } from 'react';

import { LegacySortableMediaCard } from '@/components/media/legacy/LegacyMediaCard';
import { MediaCard } from '@/components/media/MediaCard';
import { StandardItem } from '@/lib/database/types';
import { MediaItem } from '@/lib/types';

import { VirtualGrid } from './VirtualGrid';

/**
 * Props for the TierGrid component.
 */
interface TierGridProps {
  /** List of items in this tier. */
  items: (MediaItem | StandardItem)[];
  /** The ID of the tier. */
  tierId: string;
  /** Callback to remove an item. */
  onRemoveItem: (itemId: string) => void;
  /** Callback to show item details. */
  onInfo?: (item: MediaItem | StandardItem) => void;
  /** Whether the board is completely empty. */
  isBoardEmpty?: boolean;
  /** Whether this is a central/middle tier for empty state display. */
  isMiddleTier?: boolean;
  /** Whether the component is being rendered for image export. */
  isExport?: boolean;
  /** A pre-resolved map for legacy images. */
  resolvedImages?: Record<string, string>;
}

/**
 * A responsive grid component for displaying media items within a tier row.
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
  resolvedImages = {},
}: TierGridProps) {
  // Use virtualization for very large tiers (e.g. > 100 items)
  const isLargeTier = !isExport && items.length > 100;

  const renderCard = (item: MediaItem | StandardItem): ReactNode => {
    if ('identity' in item) {
      return (
        <MediaCard
          key={item.id}
          item={item}
          tierId={tierId}
          onRemove={onRemoveItem}
          onInfo={onInfo}
          isExport={isExport}
        />
      );
    }

    return (
      <LegacySortableMediaCard
        key={item.id}
        item={item}
        id={item.id}
        tierId={tierId}
        onRemove={(itemId) => onRemoveItem(itemId)}
        onInfo={onInfo as (item: MediaItem) => void}
        isExport={isExport}
        resolvedUrl={item.imageUrl ? resolvedImages[item.imageUrl] : undefined}
      />
    );
  };

  const cards = items.map((item) => renderCard(item));

  const content = isLargeTier ? (
    <VirtualGrid
      items={items}
      className="max-h-[500px] p-3"
      renderItem={renderCard}
    />
  ) : (
    cards
  );

  return (
    <div className={`flex-1 ${!isLargeTier ? 'flex flex-wrap items-center gap-2 p-3' : ''}`}>
      {isExport ? (
        <>{cards}</>
      ) : (
        <SortableContext id={tierId} items={items.map((a) => a.id)} strategy={rectSortingStrategy}>
          {content}
        </SortableContext>
      )}

      {items.length === 0 && isBoardEmpty && isMiddleTier && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-bold text-neutral-600 italic select-none">
          Drop items here...
        </div>
      )}
    </div>
  );
});
