/**
 * @file TierList.tsx
 * @description A shared component that renders the list of tiers.
 * It serves as the bridge between the data model (tiers/items) and the visual representation (TierRow),
 * handling the conditional wrapping of SortableContext for drag-and-drop functionality.
 */

'use client';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React from 'react';

import { Item,TierDefinition } from '@/board/types';

import { TierRow } from './TierRow';

/**
 * Props for the TierList component.
 */
export interface TierListProps {
  /** Array of tier definitions to render. */
  tiers: TierDefinition[];
  /** Map of items indexed by tier ID. */
  items: Record<string, Item[]>;
  /** Whether the board is being rendered for image export. */
  isExport?: boolean;
  /** Global dragging state to manage interactions. */
  isAnyDragging?: boolean;
  /** Callback to remove an item from a specific tier. */
  onRemoveItem: (tierId: string, itemId: string) => void;
  /** Callback to update a tier's properties (label, color). */
  onUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
  /** Callback to delete an entire tier. */
  onDeleteTier: (id: string) => void;
  /** Callback to show detailed information for an item. */
  onInfo?: (item: Item) => void;
}

/**
 * Renders a list of TierRows and manages the SortableContext for tier reordering.
 * @param props - The component props.
 * @param props.tiers - Array of tier definitions to render.
 * @param props.items - Map of items indexed by tier ID.
 * @param props.isExport - Whether the board is being rendered for image export.
 * @param props.isAnyDragging - Global dragging state to manage interactions.
 * @param props.onRemoveItem - Callback to remove an item from a specific tier.
 * @param props.onUpdateTier - Callback to update a tier's properties (label, color).
 * @param props.onDeleteTier - Callback to delete an entire tier.
 * @param props.onInfo - Callback to show detailed information for an item.
 * @returns The rendered TierList component.
 */
export function TierList({
  tiers,
  items,
  isExport = false,
  isAnyDragging,
  onRemoveItem,
  onUpdateTier,
  onDeleteTier,
  onInfo,
}: TierListProps) {
  const content = tiers.map((tier) => (
    <TierRow
      key={tier.id}
      tier={tier}
      items={items[tier.id] || []}
      onRemoveItem={(itemId) => onRemoveItem(tier.id, itemId)}
      onUpdateTier={onUpdateTier}
      onDeleteTier={onDeleteTier}
      canDelete={!isExport}
      isAnyDragging={isAnyDragging}
      onInfo={onInfo}
      isExport={isExport}
    />
  ));

  if (isExport) {
    return <div className="w-full space-y-4">{content}</div>;
  }

  return (
    <SortableContext items={tiers.map((t) => t.id)} strategy={verticalListSortingStrategy}>
      {content}
    </SortableContext>
  );
}
