/**
 * @file TierList.tsx
 * @description A shared component that renders the list of tiers.
 * It serves as the bridge between the data model (tiers/items) and the visual representation (TierRow),
 * handling the conditional wrapping of SortableContext for drag-and-drop functionality.
 */

'use client';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React from 'react';

import { StandardItem } from '@/lib/database/types';
import { MediaItem, TierDefinition } from '@/lib/types';

import { TierRow } from './TierRow';

/**
 * Props for the TierList component.
 */
export interface TierListProps {
  /** Array of tier definitions to render. */
  tiers: TierDefinition[];
  /** Map of items indexed by tier ID. */
  items: Record<string, (MediaItem | StandardItem)[]>;
  /** Whether the board is being rendered for image export. */
  isExport?: boolean;
  /** Pre-resolved base64 images for clean room export. */
  resolvedImages?: Record<string, string>;
  /** Global dragging state to manage interactions. */
  isAnyDragging?: boolean;
  /** Callback to remove an item from a specific tier. */
  onRemoveItem: (tierId: string, itemId: string) => void;
  /** Callback to update a tier's properties (label, color). */
  onUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
  /** Callback to delete an entire tier. */
  onDeleteTier: (id: string) => void;
  /** Callback to show detailed information for an item. */
  onInfo?: (item: MediaItem | StandardItem) => void;
}

/**
 * Renders a list of TierRows and manages the SortableContext for tier reordering.
 * @param props - The component props.
 * @returns The rendered TierList component.
 */
export function TierList({
  tiers,
  items,
  isExport = false,
  resolvedImages,
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
      resolvedImages={resolvedImages}
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
