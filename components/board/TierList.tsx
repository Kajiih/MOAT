/**
 * @file TierList.tsx
 * @description A shared component that renders the list of tiers.
 * It serves as the bridge between the data model (tiers/items) and the visual representation (TierRows),
 * handling the conditional wrapping of SortableContext for drag-and-drop functionality.
 * Used by both the interactive TierBoard and the static ExportBoard.
 * @module TierList
 */

import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TierRow } from './TierRow';
import { MediaItem, TierDefinition } from '@/lib/types';

interface TierListProps {
  tiers: TierDefinition[];
  items: Record<string, MediaItem[]>;
  isExport?: boolean;
  resolvedImages?: Record<string, string>;
  isAnyDragging?: boolean;
  onRemoveItem: (tierId: string, itemId: string) => void;
  onUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
  onDeleteTier: (id: string) => void;
  onInfo: (item: MediaItem) => void;
}

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
    <SortableContext 
        items={tiers.map(t => t.id)} 
        strategy={verticalListSortingStrategy}
    >
        {content}
    </SortableContext>
  );
}
