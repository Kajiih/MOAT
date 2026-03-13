/**
 * @file TierRow.tsx
 * @description A complex interactive component representing a single tier on the board.
 * Serves as both a draggable row and a droppable container for items.
 */

'use client';

import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { memo, useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { TierDefinition } from '@/board/types';
import { Item } from '@/items/items';

import { TierGrid } from './TierGrid';
import { TierHeader } from './TierHeader';

/**
 * Props for the TierRow component.
 */
export interface TierRowProps {
  /** The tier definition (id, label, color). */
  tier: TierDefinition;
  /** List of items currently in this tier. */
  items: Item[];
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
  onInfo?: (item: Item) => void;
  /** Whether the entire board is empty. */
  isBoardEmpty?: boolean;
  /** Whether this is a central/middle tier. */
  isMiddleTier?: boolean;
  /** Whether the component is being rendered for a screenshot export. */
  isExport?: boolean;
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
}: TierRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragHandle, setDragHandle] = useState<HTMLElement | null>(null);
  
  const [isDraggingTier, setIsDraggingTier] = useState(false);
  const [isOverRow, setIsOverRow] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || isExport) return;

    const cleanupDraggable = draggable({
      element: el,
      dragHandle: dragHandle || undefined,
      getInitialData: () => ({ type: 'tier', tier }),
      onDragStart: () => setIsDraggingTier(true),
      onDrop: () => setIsDraggingTier(false),
    });

    const cleanupDropTarget = dropTargetForElements({
      element: el,
      getData: () => ({ type: 'tier', isTierContainer: true, tierId: tier.id }),
      onDragEnter: () => setIsOverRow(true),
      onDragLeave: () => setIsOverRow(false),
      onDrop: () => setIsOverRow(false),
    });

    return () => {
      cleanupDraggable();
      cleanupDropTarget();
    };
  }, [tier, isExport, dragHandle]);

  return (
    <div
      ref={ref}
      data-testid="tier-row"
      data-tier-id={tier.id}
      data-tier-label={tier.label}
      className={twMerge(
        'relative mb-2 flex min-h-[7rem] rounded-lg border bg-surface transition-all duration-fast ease-out',
        isOverRow
          ? 'z-20 scale-[1.01] border-primary/50 bg-surface-hover shadow-card ring-1 ring-primary/30'
          : 'border-border',
        isSettingsOpen ? 'z-30' : 'z-0',
        isDraggingTier && 'scale-95 border-primary opacity-50 ring-2 ring-primary/50',
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
        setDragHandle={setDragHandle}
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
        />
      </div>
    </div>
  );
});
