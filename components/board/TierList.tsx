/**
 * @file TierList.tsx
 * @description A shared component that renders the list of tiers.
 * It serves as the bridge between the data model (tiers/items) and the visual representation (TierRows),
 * handling the conditional wrapping of SortableContext for drag-and-drop functionality.
 * Used by both the interactive TierBoard and the static ExportBoard.
 * @module TierList
 */

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React from 'react';

import { MediaItem, TierDefinition } from '@/lib/types';

import { TierRow } from './TierRow';

/**
 * Props for the TierList component.
 */
interface TierListProps {
  /** Array of tier definitions to render. */
  tiers: TierDefinition[];
  /** Map of media items indexed by tier ID. */
  items: Record<string, MediaItem[]>;
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
  /** Callback to show detailed information for a media item. */
  onInfo: (item: MediaItem) => void;
}

/**
 * Renders a list of TierRows and manages the SortableContext for tier reordering.
 * This component is shared between the interactive board and the static export board.
 * @param props - The props for the component.
 * @param props.tiers - Array of tier definitions to render.
 * @param props.items - Map of media items indexed by tier ID.
 * @param [props.isExport] - Whether the board is being rendered for image export.
 * @param [props.resolvedImages] - Pre-resolved base64 images for clean room export.
 * @param [props.isAnyDragging] - Global dragging state to manage interactions.
 * @param props.onRemoveItem - Callback to remove an item from a specific tier.
 * @param props.onUpdateTier - Callback to update a tier's properties (label, color).
 * @param props.onDeleteTier - Callback to delete an entire tier.
 * @param props.onInfo - Callback to show detailed information for a media item.
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
      canDelete={!isExport} // Assuming we don't delete in export, but in TierBoard it was passed as true (except logic in TierRow might restrict it)
      // Wait, TierBoard passes `canDelete={true}`. TierRow checks logic?
      // TierRow: `canDelete` prop is passed to `TierSettings`.
      // In ExportBoard `canDelete={false}`.
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
