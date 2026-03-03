/**
 * @file TierRow.tsx
 * @description A complex interactive component representing a single tier on the board.
 * Serves as both a draggable row and a droppable container for items.
 */

'use client';

import { useDndContext, useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo, useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { StandardItem } from '@/lib/database/types';
import { MediaItem, TierDefinition } from '@/lib/types';

import { TierHeader } from './TierHeader';
import { TierGrid } from './TierGrid';

/**
 * Props for the TierRow component.
 */
export interface TierRowProps {
  /** The tier definition (id, label, color). */
  tier: TierDefinition;
  /** List of items currently in this tier. */
  items: (MediaItem | StandardItem)[];
  /** Callback to remove an item from this tier. */
  onRemoveItem: (itemId: string) => void;
  /** Callback to update tier properties (label, color). */
  onUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
  /** Callback to delete this tier. */
  onDeleteTier: (id: string) => void;
  /** Whether this tier can be deleted. */
  canDelete: boolean;
  /** Whether any drag operation is currently active globally. */
  isAnyDragging?: boolean;
  /** Callback to show details for an item. */
  onInfo?: (item: MediaItem | StandardItem) => void;
  /** Whether the entire board is empty. */
  isBoardEmpty?: boolean;
  /** Whether this is a central/middle tier. */
  isMiddleTier?: boolean;
  /** Whether the component is being rendered for a screenshot export. */
  isExport?: boolean;
  /** A pre-resolved map for legacy images. */
  resolvedImages?: Record<string, string>;
}

/**
 * An interactive tier row that supports drag-and-drop for items and reordering.
 * @param props - The component props.
 * @returns The rendered TierRow component.
 */
export const TierRow = memo(function TierRow({
  tier,
  items,
  onRemoveItem,
  onUpdateTier,
  onDeleteTier,
  canDelete,
  isAnyDragging,
  onInfo,
  isBoardEmpty,
  isMiddleTier,
  isExport = false,
  resolvedImages = {},
}: TierRowProps) {
  // 1. Sortable logic for the Tier itself (reordering rows)
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isDraggingTier,
  } = useSortable({
    id: tier.id,
    data: {
      type: 'tier',
      tier,
    },
    disabled: isExport,
  });

  // 2. Droppable logic for items being dropped into the tier
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: tier.id,
    data: {
      isTierContainer: true,
      type: 'tier',
    },
  });

  // Combine refs
  const setCombinedRef = (node: HTMLDivElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const { over, active } = useDndContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isOverRow = useMemo(() => {
    if (!over) return false;
    if (active?.data.current?.type === 'tier') return false;

    if (over.id === tier.id) return true;
    return items.some((a) => a.id === over.id);
  }, [over, active, tier.id, items]);

  return (
    <div
      ref={setCombinedRef}
      style={style}
      data-testid="tier-row"
      data-tier-id={tier.id}
      data-tier-label={tier.label}
      className={twMerge(
        'relative mb-2 flex min-h-[7rem] rounded-lg border bg-neutral-900 transition-all duration-200 ease-out',
        isOverRow
          ? 'z-20 scale-[1.01] border-blue-500/50 bg-neutral-800 shadow-lg ring-1 ring-blue-500/30'
          : 'border-neutral-800',
        isSettingsOpen ? 'z-30' : 'z-0',
        isDraggingTier && 'scale-95 border-blue-500 opacity-50 ring-2 ring-blue-500/50',
      )}
    >
      <TierHeader
        tier={tier}
        onUpdateTier={onUpdateTier}
        onDeleteTier={onDeleteTier}
        canDelete={canDelete}
        isAnyDragging={isAnyDragging}
        isDragging={isDraggingTier}
        isExport={isExport}
        dragAttributes={attributes}
        dragListeners={listeners}
        isSettingsOpen={isSettingsOpen}
        onSettingsOpen={setIsSettingsOpen}
      />

      {/* Items Column */}
      <div
        className="relative flex min-h-[100px] min-w-0 flex-1 flex-col"
        data-testid="tier-drop-zone"
      >
        {isOverRow && <div className="pointer-events-none absolute inset-0 z-10 bg-blue-500/5" />}

        <TierGrid
          items={items}
          tierId={tier.id}
          onRemoveItem={onRemoveItem}
          onInfo={onInfo}
          isBoardEmpty={isBoardEmpty}
          isMiddleTier={isMiddleTier}
          isExport={isExport}
          resolvedImages={resolvedImages}
        />
      </div>
    </div>
  );
});
