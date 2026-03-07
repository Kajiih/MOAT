/**
 * @file ItemCard.tsx
 * @description The primary visual representation for items on the board.
 * Tailored for the V2 architecture with support for Items.
 * Handles drag-and-drop integration and rich metadata rendering.
 */

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Info, X } from 'lucide-react';
import React from 'react';

import { Item } from '@/items/schemas';
import { registry } from '@/providers/registry';

import { ItemImage } from './ItemImage';

/**
 * Props for the ItemCard component.
 */
export interface ItemCardProps {
  /** The item to display. */
  item: Item;
  /** The ID of the tier this card belongs to. */
  tierId?: string;
  /** Whether the card is currently being dragged. */
  isDragging?: boolean;
  /** Whether the item is already added to the board (from search). */
  isAdded?: boolean;
  /** Whether the component is being rendered for image export. */
  isExport?: boolean;
  /** A pre-resolved URL for the image. */
  resolvedUrl?: string;
  /** Whether the image should be loaded with priority. */
  priority?: boolean;
  /** Callback to remove the item. */
  onRemove?: (id: string) => void;
  /** Callback to show item details. */
  onInfo?: (item: Item) => void;
  /** Callback to locate the item on the board. */
  onLocate?: () => void;
}

/**
 * A standardized card component for displaying and interacting with items.
 * @param props - The component props.
 * @param props.item
 * @param props.tierId
 * @param props.isDragging
 * @param props.isAdded
 * @param props.isExport
 * @param props.resolvedUrl
 * @param props.priority
 * @param props.onRemove
 * @param props.onInfo
 * @returns The rendered ItemCard component.
 */

export const ITEM_CARD_BASE_CLASSES = "aspect-square w-full overflow-hidden rounded-md bg-neutral-900 shadow-lg";

export function ItemCard({
  item,
  tierId,
  isDragging,
  isAdded,
  isExport,
  resolvedUrl,
  priority,
  onRemove,
  onInfo,
}: ItemCardProps) {
  // 1. Get configuration from registry
  const entityDef = registry.getEntity(item.identity.databaseId, item.identity.entityId);
  const TypeIcon = entityDef.branding.icon || Info;

  // 2. Setup DND (Sorting or Draggable)
  const id = tierId ? `board-${item.id}` : `search-${item.id}`;
  const dnd = useSortable({
    id,
    data: {
      type: 'item',
      item,
      tierId,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(dnd.transform),
    transition: dnd.transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={dnd.setNodeRef}
      style={style}
      className={`group relative transition-shadow hover:shadow-xl ${ITEM_CARD_BASE_CLASSES} ${
        isAdded ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black' : ''
      }`}
    >
      {/* 1. Drag & Drop Interaction Layer (Separate from buttons) */}
      <div 
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        aria-label={item.title}
        {...dnd.attributes}
        {...dnd.listeners}
      />

      {/* 2. The Visuals */}
      <div className="pointer-events-none">
        <ItemImage
          item={item}
          TypeIcon={TypeIcon}
          isExport={isExport}
          resolvedUrl={resolvedUrl}
          priority={priority}
        />

        {/* Overlay / Content */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/100 via-black/80 to-transparent p-2 pt-6">
          <p className="line-clamp-2 text-[10px] font-bold text-white leading-tight">
            {item.title}
          </p>
          {(item.subtitle || item.tertiaryText) && (
            <p className="mt-0.5 line-clamp-1 text-[9px] text-neutral-400 leading-tight">
              {item.subtitle || item.tertiaryText}
            </p>
          )}
        </div>
      </div>

      {/* 3. Actions (Visible on Hover) */}
      {!isExport && (
        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600/90 text-white hover:bg-red-500"
              title="Remove"
            >
              <X size={12} />
            </button>
          )}
          {onInfo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInfo(item);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800/90 text-white hover:bg-neutral-700"
              title="Details"
            >
              <Info size={12} />
            </button>
          )}
        </div>
      )}

      {/* 4. Rating Indicator (If exists) */}
      {item.rating !== undefined && (
        <div className="absolute top-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[8px] font-black text-white backdrop-blur-sm border border-white/10">
          {item.rating.toFixed(1)}
        </div>
      )}
    </div>
  );
}
