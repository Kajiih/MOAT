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
import { SortableMediaCard } from '@/components/MediaCard';
import { VirtualGrid } from '@/components/VirtualGrid';

interface TierGridProps {
  items: MediaItem[];
  tierId: string;
  onRemoveItem: (itemId: string) => void;
  onInfo: (item: MediaItem) => void;
  isBoardEmpty?: boolean;
  isMiddleTier?: boolean;
}

export const TierGrid = memo(function TierGrid({
  items,
  tierId,
  onRemoveItem,
  onInfo,
  isBoardEmpty,
  isMiddleTier
}: TierGridProps) {
  // Use virtualization for very large tiers (e.g. > 100 items)
  const isLargeTier = items.length > 100;

  return (
    <div className={`flex-1 ${!isLargeTier ? 'p-3 flex flex-wrap items-center gap-2' : ''}`}>
        <SortableContext id={tierId} items={items.map(a => a.id)} strategy={rectSortingStrategy}>
        {isLargeTier ? (
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
                    />
                )}
            />
        ) : (
            items.map((item) => (
                <SortableMediaCard
                    key={item.id}
                    item={item}
                    id={item.id}
                    tierId={tierId}
                    onRemove={(itemId) => onRemoveItem(itemId)}
                    onInfo={onInfo}
                />
            ))
        )}
        </SortableContext>

        {items.length === 0 && isBoardEmpty && isMiddleTier && (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-600 text-lg font-bold italic pointer-events-none select-none">
                Drop items here...
            </div>
        )}
    </div>
  );
});
