/**
 * @file ItemCard.tsx
 * @description The primary visual representation for items on the board.
 * Tailored architecture with support for Items.
 * Handles drag-and-drop integration and rich metadata rendering.
 */

'use client';

import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge, Edge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { Info, X } from 'lucide-react';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { DropIndicator } from '@/core/ui/DropIndicator';
import { InteractionContext } from '@/core/ui/InteractionContext';
import { getSubtitleString, Item } from '@/domain/items/items';
import { useTierListContext } from '@/features/board/context';
import { registry } from '@/infra/providers/registry';

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
  /** Optional override for the drop indicator edge, useful for append zones. */
  overrideClosestEdge?: Edge | null;
  /** Optional class overrides. */
  className?: string;
}

/**
 * Standardized Card Dimensions utilized to synchronize responsive sizing between
 * Tailwind inline layouts and Next.js optimized image resolutions.
 *
 * Note: The explicit `tw` string (e.g. 'w-24') MUST be strictly declared alongside
 * the `px` value. Tailwind CSS uses static string extraction at build time and
 * will purge computed class names (e.g. `w-${px/4}`) from the production CSS bundle.
 */
export const ITEM_CARD_DIMENSIONS = {
  mobile: { px: 112, tw: 'w-28' },
  desktop: { px: 128, tw: 'w-32' },
} as const;

/**
 * Shared base classes for rendering item cards uniformly.
 */
export const ITEM_CARD_BASE_CLASSES = `${ITEM_CARD_DIMENSIONS.mobile.tw} sm:${ITEM_CARD_DIMENSIONS.desktop.tw} aspect-square shrink-0`;

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
 * @param props.overrideClosestEdge - Optional override for the drop indicator edge.
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
  overrideClosestEdge,
  className,
}: ItemCardProps) {
  // 1. Get configuration from registry
  const entityDef = registry.getEntity(item.identity.providerId, item.identity.entityId);
  const TypeIcon = entityDef.branding.icon || Info;
  const baseColorClass = entityDef?.branding.colorClass || '';

  // 2. Setup Pragmatic Drag and Drop
  const ref = useRef<HTMLDivElement>(null);
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const [isOverLocal, setIsOverLocal] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  const interactionContext = useContext(InteractionContext);
  const setHoveredItem = interactionContext?.setHoveredItem;

  // 3. Global Keyboard State
  const tierListContext = useTierListContext();
  const actions = tierListContext?.actions;
  const activeKeyboardDragId = tierListContext?.ui.activeKeyboardDragId;
  const setActiveKeyboardDragId = tierListContext?.ui.setActiveKeyboardDragId;
  const cardPrefs = tierListContext?.ui.cardPrefs;
  const isKeyboardDragging =
    activeKeyboardDragId?.itemId === item.id && activeKeyboardDragId?.tierId === tierId;

  // React destroys focus when `actions.moveItem` bridges a card across tiers (Component unmounts/remounts).
  // This listener immediately reclaims native DOM focus upon remount if context remembers the drag session.
  useEffect(() => {
    if (isKeyboardDragging) {
      ref.current?.focus();
    }
  }, [isKeyboardDragging]);

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
      onDragEnter: ({ self }) => {
        setIsOverLocal(true);
        setClosestEdge(extractClosestEdge(self.data));
      },
      onDrag: ({ self }) => {
        setClosestEdge(extractClosestEdge(self.data));
      },
      onDragLeave: () => {
        setIsOverLocal(false);
        setClosestEdge(null);
      },
      onDrop: () => {
        setIsOverLocal(false);
        setClosestEdge(null);
      },
    });

    return () => {
      cleanupDraggable();
      cleanupDropTarget();
    };
  }, [item, tierId, isExport]);

  const activeDragging = isDragging || isDraggingLocal || isKeyboardDragging;
  const activeEdge = overrideClosestEdge !== undefined && overrideClosestEdge !== null
    ? overrideClosestEdge
    : closestEdge;

  const style: React.CSSProperties = {
    opacity: activeDragging ? 0.4 : 1,
    zIndex: activeDragging ? 1000 : 1,
  };

  const handleToggleDrag = () => {
    if (tierId) {
      setActiveKeyboardDragId?.(isKeyboardDragging ? null : { itemId: item.id, tierId });
    }
  };

  const handleCancelDrag = () => {
    if (isKeyboardDragging) {
      setActiveKeyboardDragId?.(null);
    }
  };

  const handleVerticalMove = (isUp: boolean, currentTier: HTMLElement) => {
    const targetTier = isUp ? currentTier.previousElementSibling : currentTier.nextElementSibling;

    if (targetTier instanceof HTMLElement && Object.hasOwn(targetTier.dataset, 'tierId')) {
      const overTierId = targetTier.dataset.tierId;
      if (overTierId && actions) {
        actions.moveItem({
          activeId: item.id,
          overId: overTierId,
          activeItem: item,
          edge: isUp ? 'right' : 'left',
        });
        setActiveKeyboardDragId?.({ itemId: item.id, tierId: overTierId });

        setTimeout(() => {
          ref.current?.focus();
        }, 10);
      }
    }
  };

  const handleHorizontalMove = (isRight: boolean) => {
    const targetEl = isRight
      ? ref.current?.nextElementSibling
      : ref.current?.previousElementSibling;

    if (targetEl instanceof HTMLElement && Object.hasOwn(targetEl.dataset, 'testid')) {
      const targetIdAttr = targetEl.dataset.testid;
      const overId = targetIdAttr?.replace('item-card-', '');
      if (overId && actions) {
        actions.moveItem({
          activeId: item.id,
          overId,
          activeItem: item,
          edge: isRight ? 'right' : 'left',
        });

        // Refocus item so they can chain moves
        setTimeout(() => {
          ref.current?.focus();
        }, 10);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggleDrag();
      return;
    }

    if (e.key === 'Escape') {
      if (isKeyboardDragging) e.preventDefault();
      handleCancelDrag();
      return;
    }

    if (!isKeyboardDragging || !actions) return;

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentTier = (e.currentTarget as HTMLElement).closest('[data-tier-id]');
      if (currentTier) handleVerticalMove(e.key === 'ArrowUp', currentTier as HTMLElement);
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      handleHorizontalMove(e.key === 'ArrowRight');
    }
  };

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={activeDragging}
      tabIndex={0}
      onMouseEnter={() => setHoveredItem?.(item)}
      onMouseLeave={() => setHoveredItem?.(null)}
      onFocus={() => setHoveredItem?.(item)}
      onBlur={() => {
        setHoveredItem?.(null);
        // Only clear drag state if we are truly unfocusing (not just remounting to another tier)
        // Wait, if it remounts, onBlur fires FIRST before unmount. So we can't blindly clear it onBlur!
        // Actually, if we clear it onBlur, the cross-tier movement immediately kills the drag!
        // We should ONLY clear drag state on Escape, or Space/Enter toggle.
        // DO NOT clear setActiveKeyboardDragId(null) here, otherwise bridging tiers cancels the drag.
      }}
      onKeyDown={handleKeyDown}
      style={style}
      data-testid={`item-card-${item.id}`}
      className={twMerge(
        `group duration-fast relative p-1 transition-all ${ITEM_CARD_BASE_CLASSES}`,
        isAdded ? 'opacity-70 grayscale' : '',
        isOverLocal ? 'z-40' : '',
        className,
      )}
    >
      {/* 1. Drag & Drop Interaction Layer (Separate from buttons) */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        aria-label={item.title}
      />

      {/* 2. The Visuals */}
      <div className="bg-surface shadow-card pointer-events-none absolute inset-1 overflow-hidden rounded-md">
        {/* Bottom Accent Strip */}
        {cardPrefs?.showUnderlay !== false && (
          <div
            className={`absolute inset-x-0 bottom-0 h-[1.5px] ${baseColorClass} z-20 bg-current opacity-30 shadow-sm`}
          />
        )}
        {/* Top Indicator & Icon Tray */}
        {(item.rating !== undefined ||
          (cardPrefs?.showIcon !== false && entityDef.branding.icon !== undefined)) && (
          <div className="absolute top-1 left-1 z-20 flex items-center gap-1.5">
            {cardPrefs?.showIcon !== false && entityDef.branding.icon !== undefined && (
              <div className="flex items-center justify-center rounded-full border border-white/10 bg-black/60 p-1 shadow-sm backdrop-blur-sm">
                <TypeIcon
                  size={12}
                  className={`opacity-90 ${cardPrefs?.coloredIcon !== false ? baseColorClass : 'text-white'}`}
                />
              </div>
            )}
            {item.rating !== undefined && (
              <div className="text-indicator rounded-md border border-white/10 bg-black/60 px-1 py-0.5 font-black text-white shadow-sm backdrop-blur-sm">
                {item.rating.toFixed(1)}
              </div>
            )}
          </div>
        )}
        <ItemImage
          item={item}
          TypeIcon={TypeIcon}
          isExport={isExport}
          resolvedUrl={resolvedUrl}
          priority={priority}
        />

        {/* Overlay / Content */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/100 via-black/80 to-transparent p-2 pt-6">
          <p className="text-caption line-clamp-2 leading-tight font-bold text-white">
            {item.title}
          </p>
          {((item.subtitle && item.subtitle.length > 0) || item.tertiaryText) && (
            <p className="text-caption text-secondary mt-0.5 line-clamp-1 leading-tight">
              {getSubtitleString(item.subtitle) || item.tertiaryText}
            </p>
          )}
        </div>

        {/* Notes Indicator */}
        {item.notes && (
          <div
            data-testid="notes-indicator"
            className="bg-highlight/90 text-background absolute right-1 bottom-1 z-20 flex h-4 w-4 items-center justify-center rounded-sm shadow-sm transition-transform group-hover/card:scale-110"
            title="Contains personal notes"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-current" />
          </div>
        )}
      </div>

      {/* 3. Actions (Visible on Hover) */}
      {!isExport && (
        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600/90 text-white hover:bg-red-500"
              title="Remove"
              tabIndex={-1}
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
              tabIndex={-1}
            >
              <Info size={12} />
            </button>
          )}
        </div>
      )}
      {activeEdge && <DropIndicator edge={activeEdge} />}
    </div>
  );
}
