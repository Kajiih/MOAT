/**
 * @file ItemCard.tsx
 * @description The primary visual representation for items on the board.
 * Tailored architecture with support for Items.
 * Handles drag-and-drop integration and rich metadata rendering.
 */

'use client';

import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { Info, X } from 'lucide-react';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { Item } from '@/items/items';
import { InteractionContext } from '@/lib/ui/InteractionContext';
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
  /** Optional class overrides. */
  className?: string;
}

/**
 * Shared base classes for rendering item cards uniformly.
 */
export const ITEM_CARD_BASE_CLASSES = "aspect-square w-full overflow-hidden rounded-md bg-surface shadow-card";

/**
 * A standardized card component for displaying and interacting with items.
 * @param props - The component props.
 * @param props.item - The item to display.
 * @param props.tierId - The ID of the tier this card belongs to.
 * @param props.isDragging - Whether the card is currently being dragged.
 * @param props.isAdded - Whether the item is already added to the board (from search).
 * @param props.isExport - Whether the component is being rendered for image export.
 * @param props.resolvedUrl - A pre-resolved URL for the image.
 * @param props.priority - Whether the image should be loaded with priority.
 * @param props.onRemove - Callback to remove the item.
 * @param props.onInfo - Callback to show item details.
 * @param props.className - Optional class overrides.
 * @returns The rendered ItemCard component.
 */
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
  className,
}: ItemCardProps) {
  // 1. Get configuration from registry
  const entityDef = registry.getEntity(item.identity.databaseId, item.identity.entityId);
  const TypeIcon = entityDef.branding.icon || Info;

  // 2. Setup Pragmatic Drag and Drop
  const ref = useRef<HTMLDivElement>(null);
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const [isOverLocal, setIsOverLocal] = useState(false);
  
  const interactionContext = useContext(InteractionContext);
  const setHoveredItem = interactionContext?.setHoveredItem;

  useEffect(() => {
    const el = ref.current;
    if (!el || isExport) return;

    const cleanupDraggable = draggable({
      element: el,
      getInitialData: () => ({ type: 'item', item, tierId }),
      onDragStart: () => setIsDraggingLocal(true),
      onDrop: () => setIsDraggingLocal(false),
    });

    const cleanupDropTarget = dropTargetForElements({
      element: el,
      getData: ({ input }) => {
        const baseData = { type: 'item', item, tierId };
        return attachClosestEdge(baseData, {
          element: el,
          input,
          allowedEdges: ['left', 'right'],
        });
      },
      onDragEnter: () => setIsOverLocal(true),
      onDragLeave: () => setIsOverLocal(false),
      onDrop: () => setIsOverLocal(false),
    });

    return () => {
      cleanupDraggable();
      cleanupDropTarget();
    };
  }, [item, tierId, isExport]);

  const activeDragging = isDragging || isDraggingLocal;

  const style: React.CSSProperties = {
    opacity: activeDragging ? 0.4 : 1,
    zIndex: activeDragging ? 1000 : 1,
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      onMouseEnter={() => setHoveredItem?.(item)}
      onMouseLeave={() => setHoveredItem?.(null)}
      onFocus={() => setHoveredItem?.(item)}
      onBlur={() => setHoveredItem?.(null)}
      style={style}
      data-testid={`item-card-${item.id}`}
      className={twMerge(
        `group relative transition-all duration-fast hover:shadow-xl ${ITEM_CARD_BASE_CLASSES}`,
        isAdded ? 'ring-2 ring-primary ring-offset-2 ring-offset-black' : '',
        isOverLocal ? 'ring-2 ring-emerald-500 scale-105 z-50' : '',
        className
      )}
    >
      {/* 1. Drag & Drop Interaction Layer (Separate from buttons) */}
      <div 
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        aria-label={item.title}
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
          <p className="line-clamp-2 text-caption font-bold text-white leading-tight">
            {item.title}
          </p>
          {(item.subtitle || item.tertiaryText) && (
            <p className="mt-0.5 line-clamp-1 text-caption text-secondary leading-tight">
              {item.subtitle || item.tertiaryText}
            </p>
          )}
        </div>
        
        {/* Notes Indicator */}
        {item.notes && (
          <div
            data-testid="notes-indicator"
            className="absolute bottom-1 right-1 z-20 flex h-4 w-4 items-center justify-center rounded-sm bg-highlight/90 text-background shadow-sm transition-transform group-hover/card:scale-110"
            title="Contains personal notes"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-current" />
          </div>
        )}
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
              className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              title="Details"
            >
              <Info size={12} />
            </button>
          )}
        </div>
      )}

      {/* 4. Rating Indicator (If exists) */}
      {item.rating !== undefined && (
        <div className="absolute top-1 left-1 rounded-md bg-black/60 px-1 py-0.5 text-indicator font-black text-white backdrop-blur-sm border border-white/10">
          {item.rating.toFixed(1)}
        </div>
      )}
    </div>
  );
}
