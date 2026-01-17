/**
 * @file TierGrid.tsx
 * @description Renders the grid of items within a tier.
 * Automatically switches between a standard flex layout and a virtualized grid
 * based on the number of items to ensure performance.
 * @module TierGrid
 */

import { memo } from 'react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { MediaItem } from '@/lib/types';
import { SortableMediaCard } from '@/components/media/MediaCard';
import { VirtualGrid } from './VirtualGrid';

interface TierGridProps {
  items: MediaItem[];
  tierId: string;
  onRemoveItem: (itemId: string) => void;
  onInfo: (item: MediaItem) => void;
  isBoardEmpty?: boolean;
  isMiddleTier?: boolean;
  /** Whether the component is being rendered for a screenshot export. */
  isExport?: boolean;
  /** A pre-resolved map for images. */
  resolvedImages?: Record<string, string>;
}

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
  // Disable virtualization during export to ensure all items are rendered in the DOM for capture
  const isLargeTier = !isExport && items.length > 100;

  const cards = items.map((item) => (
    <SortableMediaCard
      key={item.id}
      item={item}
      id={item.id}
      tierId={tierId}
      onRemove={(itemId) => onRemoveItem(itemId)}
      onInfo={onInfo}
      isExport={isExport}
      resolvedUrl={item.imageUrl ? resolvedImages[item.imageUrl] : undefined}
    />
  ));

  const content = isLargeTier ? (
    <VirtualGrid
      items={items}
      className="max-h-[500px] p-3"
      renderItem={(item) => (
        <SortableMediaCard
          key={item.id}
          item={item}
          id={item.id}
          tierId={tierId}
          onRemove={(itemId) => onRemoveItem(itemId)}
          onInfo={onInfo}
          isExport={isExport}
          resolvedUrl={item.imageUrl ? resolvedImages[item.imageUrl] : undefined}
        />
      )}
    />
  ) : (
    cards
  );

  return (
    <div className={`flex-1 ${!isLargeTier ? 'p-3 flex flex-wrap items-center gap-2' : ''}`}>
      {isExport ? (
        <>{cards}</>
      ) : (
        <SortableContext id={tierId} items={items.map((a) => a.id)} strategy={rectSortingStrategy}>
          {content}
        </SortableContext>
      )}

      {items.length === 0 && isBoardEmpty && isMiddleTier && (
        <div className="absolute inset-0 flex items-center justify-center text-neutral-600 text-lg font-bold italic pointer-events-none select-none">
          Drop items here...
        </div>
      )}
    </div>
  );
});
