/**
 * @file TierRow.tsx
 * @description A complex interactive component representing a single tier on the board.
 * It serves as both a draggable item (for reordering tiers) and a droppable container (for media items).
 * Integrates with \@dnd-kit's SortableContext to manage the horizontal list of MediaCards.
 * @module TierRow
 */

'use client';

import { useDndContext, useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo, useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { getColorTheme } from '@/lib/colors';
import { MediaItem, TierDefinition } from '@/lib/types';

import { TierGrid } from './TierGrid';
import { TierLabel } from './TierLabel';
import { TierSettings } from './TierSettings';

interface TierRowProps {
  /** The tier definition (id, label, color). */
  tier: TierDefinition;
  /** List of media items currently in this tier. */
  items: MediaItem[];
  /** Callback to remove an item from this tier. */
  onRemoveItem: (itemId: string) => void;
  /** Callback to update tier properties (label, color). */
  onUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
  /** Callback to delete this tier. */
  onDeleteTier: (id: string) => void;
  /** Whether this tier can be deleted (usually false for the last remaining tier, if enforced). */
  canDelete: boolean;
  /** Whether any drag operation is currently active globally. */
  isAnyDragging?: boolean;
  /** Callback to show details for an item. */
  onInfo?: (item: MediaItem) => void;
  /** Whether the entire board is empty (used for empty state placeholder). */
  isBoardEmpty?: boolean;
  /** Whether this is the middle tier (used for empty state placeholder). */
  isMiddleTier?: boolean;
  /** Whether the component is being rendered for a screenshot export. */
  isExport?: boolean;
  /** A pre-resolved map for the image. */
  resolvedImages?: Record<string, string>;
}

/**
 * A single row in the tier list.
 * Handles:
 * - Droppable zone for items.
 * - Sortable context for items within.
 * - Tier header (label editing, color settings, reordering handle).
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
  // Resolve the full color theme from the ID
  const tierTheme = getColorTheme(tier.color);

  // Sortable logic for the Tier itself (reordering rows)
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
  });

  // Droppable logic for items being dropped into the tier
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
  const [showSettings, setShowSettings] = useState(false);

  const isOverRow = useMemo(() => {
    if (!over) return false;
    // Don't highlight if we are dragging a tier over another tier (visual preference)
    if (active?.data.current?.type === 'tier') return false;

    if (over.id === tier.id) return true;
    return items.some((a) => a.id === over.id);
  }, [over, active, tier.id, items]);

  return (
    <div
      ref={setCombinedRef}
      style={style}
      className={twMerge(
        'relative mb-2 flex min-h-[7rem] rounded-lg border bg-neutral-900 transition-all duration-200 ease-out',
        isOverRow
          ? 'z-20 scale-[1.01] border-blue-500/50 bg-neutral-800 shadow-lg ring-1 ring-blue-500/30'
          : 'border-neutral-800',
        showSettings ? 'z-30' : 'z-0',
        isDraggingTier && 'scale-95 border-blue-500 opacity-50 ring-2 ring-blue-500/50',
      )}
    >
      {/* Label / Header Column */}
      <div
        className={twMerge(
          'group/row relative flex w-24 shrink-0 flex-col items-center justify-center rounded-l-lg p-2 transition-colors md:w-32',
          tierTheme.bg, // Apply the background class from the theme
        )}
      >
        <TierLabel
          label={tier.label}
          onUpdate={(newLabel) => onUpdateTier(tier.id, { label: newLabel })}
          dragAttributes={attributes}
          dragListeners={listeners}
          isAnyDragging={isAnyDragging}
          isExport={isExport}
        />

        {!isExport && (
          <TierSettings
            color={tier.color}
            onUpdateColor={(colorId) => onUpdateTier(tier.id, { color: colorId })}
            onDelete={() => onDeleteTier(tier.id)}
            canDelete={canDelete}
            isOpen={showSettings}
            onToggle={() => setShowSettings(!showSettings)}
            onClose={() => setShowSettings(false)}
            isAnyDragging={isAnyDragging}
          />
        )}
      </div>

      {/* Items Column */}
      <div className="relative flex min-h-[100px] min-w-0 flex-1 flex-col">
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
