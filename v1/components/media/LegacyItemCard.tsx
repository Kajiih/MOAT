/**
 * @file LegacyItemCard.tsx
 * @description [LEGACY V1] Visual representation of media items in the previous architecture.
 * Exports both a draggable version (LegacyItemCard) and a sortable version (LegacySortableItemCard).
 * @deprecated Use the new ItemCard component for V2 Items.
 */

'use client';

import { DraggableAttributes, useDraggable } from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, Info, StickyNote, X } from 'lucide-react';

import { useInteraction } from '@/components/ui/InteractionContext';
import { useItemResolver } from '@/lib/hooks';
import { Item, LegacyItem } from '@/lib/types';
import { toDomId } from '@/lib/utils/ids';
import { itemTypeRegistry } from '@/v1/lib/item-types';

import { LegacyItemImage } from './LegacyItemImage';

/**
 * Props for the visual representation of a legacy media card.
 */
interface LegacyMediaCardProps {
  /** The media data object (V1 LegacyItem or V2 Item). */
  item: Item;
  /** The ID of the tier this card belongs to, if any. */
  tierId?: string;
  /** Callback to remove this item from its tier. */
  onRemove?: (id: string) => void;
  /** Ref callback for the draggable/sortable node. */
  setNodeRef?: (node: HTMLElement | null) => void;
  /** Inline styles (transform, transition) provided by dnd-kit. */
  style?: React.CSSProperties;
  /** Draggable attributes (role, tabindex, etc.) provided by dnd-kit. */
  attributes?: DraggableAttributes;
  /** Event listeners (onPointerDown, onKeyDown, etc.) provided by dnd-kit. */
  listeners?: SyntheticListenerMap;
  /** Whether the item is currently being dragged. */
  isDragging?: boolean;
  /** Whether this item is already present on the board (used in Search results). */
  isAdded?: boolean;
  /** Callback to locate this item on the board. */
  onLocate?: () => void;
  /** Unique DOM ID for scrolling/anchoring. */
  domId?: string;
  /** Whether to prioritize loading the image (eager load). Defaults to false. */
  priority?: boolean;
  /** Callback to show details modal. */
  onInfo?: (item: any) => void;
  /** Whether the component is being rendered for a screenshot export. */
  isExport?: boolean;
  /** A pre-resolved Data URL for the image. */
  resolvedUrl?: string;
}

/**
 * Overlay component for legacy media info.
 * @param root0
 * @param root0.item
 * @param root0.isExport
 * @param root0.line2
 * @param root0.line3
 */
function LegacyMediaCardOverlay({
  item,
  isExport,
  line2,
  line3,
}: {
  item: Item;
  isExport: boolean;
  line2: string | undefined;
  line3: string | undefined;
}) {
  return (
    <div
      className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/100 via-black/90 to-transparent px-1.5 pt-8 pb-1 ${isExport ? 'z-10' : ''}`}
    >
      <p className="mb-0.5 line-clamp-2 text-[10px] leading-tight font-bold text-white">
        {item.title}
      </p>

      {line2 && (
        <p
          className={`line-clamp-2 text-[9px] leading-tight ${line3 ? 'mb-0.5 text-neutral-200' : 'text-neutral-400'}`}
        >
          {line2}
        </p>
      )}

      {line3 && <p className="line-clamp-2 text-[9px] leading-tight text-neutral-400">{line3}</p>}
    </div>
  );
}

/**
 * The pure presentation component for a legacy item.
 * Useful for DragOverlays or non-interactive previews.
 * @param root0
 * @param root0.item
 * @param root0.tierId
 * @param root0.onRemove
 * @param root0.setNodeRef
 * @param root0.style
 * @param root0.attributes
 * @param root0.listeners
 * @param root0.isDragging
 * @param root0.isAdded
 * @param root0.onLocate
 * @param root0.domId
 * @param root0.priority
 * @param root0.onInfo
 * @param root0.isExport
 * @param root0.resolvedUrl
 */
/**
 * The pure presentation component for a legacy item.
 * Useful for DragOverlays or non-interactive previews.
 */
export function BaseLegacyItemCard({
  item: initialItem,
  tierId,
  onRemove,
  setNodeRef,
  style,
  attributes,
  listeners,
  isDragging,
  isAdded,
  onLocate,
  domId,
  priority = false,
  onInfo,
  isExport = false,
  resolvedUrl,
}: LegacyMediaCardProps) {
  // V1 vs V2 differentiation for display logic
  const isV2 = 'identity' in initialItem;

  const { resolvedItem } = useItemResolver(!isV2 ? (initialItem as LegacyItem) : (null as any), { enabled: false });
  const item = (resolvedItem || initialItem) as any;
  const interaction = useInteraction();
  
  const definition = !isV2 ? itemTypeRegistry.get(item.type) : null;
  const TypeIcon = definition?.icon || item.branding?.icon;

  // Construct lines of info
  const line2 = isV2 ? item.subtitle : definition?.getSubtitle(item);
  const line3 = isV2 ? item.tertiaryText : definition?.getTertiaryText(item);

  let interactionClasses = 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-neutral-400';
  if (isExport) {
    if (onInfo) {
      interactionClasses = 'cursor-pointer flex-shrink-0 z-0';
    } else {
      interactionClasses = 'flex-shrink-0 z-0';
    }
  } else if (isAdded) {
    interactionClasses =
      'opacity-50 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:opacity-100 grayscale hover:grayscale-0';
  }

  const containerClassName = `
    relative group/card w-28 h-28 bg-neutral-800 rounded-md overflow-hidden shadow-sm touch-pan-y select-none
    ${interactionClasses}
  `;

  return (
    <div
      ref={setNodeRef}
      id={domId || toDomId(item.id)}
      style={style}
      {...listeners}
      {...attributes}
      onClick={!isExport && isAdded && onLocate ? onLocate : undefined}
      onMouseEnter={!isExport ? () => interaction?.setHoveredItem({ item, tierId }) : undefined}
      onMouseLeave={!isExport ? () => interaction?.setHoveredItem(null) : undefined}
      className={containerClassName}
    >
      <LegacyItemImage
        item={item}
        isExport={isExport}
        resolvedUrl={resolvedUrl}
        priority={priority}
        TypeIcon={TypeIcon}
      />

      <LegacyMediaCardOverlay item={item} isExport={isExport} line2={line2} line3={line3} />

      {isAdded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/card:opacity-100">
          <Eye className="text-white drop-shadow-md" size={24} />
        </div>
      )}

      {!isExport && tierId && onRemove && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="absolute top-1 right-1 rounded-full bg-red-600/80 p-0.5 text-white opacity-0 transition-opacity group-hover/card:opacity-100 hover:bg-red-600"
          title="Remove item"
        >
          <X size={12} />
        </button>
      )}

      {onInfo && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onInfo(item);
          }}
          className="absolute top-1 left-1 rounded-full bg-blue-600/80 p-0.5 text-white opacity-0 transition-opacity group-hover/card:opacity-100 hover:bg-blue-600"
          title="View details"
        >
          <Info size={12} />
        </button>
      )}

      {(item as any).notes && (
        <div
          className="pointer-events-none absolute right-1 bottom-1 z-20 flex h-4 w-4 items-center justify-center rounded-sm bg-amber-400/90 text-neutral-900 shadow-sm transition-transform group-hover/card:scale-110"
          title="Contains personal notes"
        >
          <StickyNote size={10} strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

/**
 * Public props for legacy media cards.
 */
interface LegacyMediaCardPropsPublic {
  item: Item;
  id?: string;
  tierId?: string;
  onRemove?: (id: string) => void;
  isAdded?: boolean;
  onLocate?: (id: string) => void;
  priority?: boolean;
  onInfo?: (item: any) => void;
  isExport?: boolean;
  resolvedUrl?: string;
}

/**
 * A Draggable legacy media card component.
 * @param props
 */
export function LegacyItemCard(props: LegacyMediaCardPropsPublic) {
  const draggableId = props.id || props.item.id;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: { item: props.item, sourceTier: props.tierId, isV2: 'identity' in props.item },
    disabled: props.isAdded,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <BaseLegacyItemCard
      {...props}
      domId={toDomId(draggableId)}
      setNodeRef={setNodeRef}
      style={style}
      attributes={attributes}
      listeners={listeners}
      isDragging={isDragging}
      onLocate={() => props.onLocate?.(props.item.id)}
    />
  );
}

/**
 * A Sortable legacy media card component.
 * @param props
 */
export function LegacySortableItemCard(props: LegacyMediaCardPropsPublic) {
  const draggableId = props.id || props.item.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: draggableId,
    data: { item: props.item, sourceTier: props.tierId, isV2: 'identity' in props.item },
    disabled: props.isExport,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <BaseLegacyItemCard
      {...props}
      domId={toDomId(draggableId)}
      setNodeRef={setNodeRef}
      style={style}
      attributes={attributes}
      listeners={listeners}
      isDragging={isDragging}
      onLocate={props.onLocate ? () => props.onLocate!(props.item.id) : undefined}
    />
  );
}
