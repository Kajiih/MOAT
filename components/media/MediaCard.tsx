/**
 * @file MediaCard.tsx
 * @description Provides the visual representation of media items (Album, Artist, Song) in the UI.
 * Exports both a draggable version (MediaCard) for the search panel and a sortable version (SortableMediaCard) for the tier rows.
 * @module MediaCard
 */

'use client';

import { DraggableAttributes,useDraggable } from '@dnd-kit/core';
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, Info, LucideIcon,X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { useInteraction } from '@/components/ui/InteractionContext';
import { failedImages } from '@/lib/image-cache';
import { getMediaUI } from '@/lib/media-defs';
import { MediaItem } from '@/lib/types';

/**
 * Props for the visual representation of a media card.
 */
interface BaseMediaCardProps {
  /** The media data object (Album, Artist, or Song). */
  item: MediaItem;
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
  onInfo?: (item: MediaItem) => void;
  /** Whether the component is being rendered for a screenshot export. */
  isExport?: boolean;
  /** A pre-resolved Data URL for the image. */
  resolvedUrl?: string;
}

function MediaCardImage({
  item,
  isExport,
  resolvedUrl,
  priority,
  TypeIcon,
}: {
  item: MediaItem;
  isExport: boolean;
  resolvedUrl?: string;
  priority: boolean;
  TypeIcon: LucideIcon;
}) {
  const [imageError, setImageError] = useState(() => {
    return item.imageUrl ? failedImages.has(item.imageUrl) : false;
  });
  const [retryUnoptimized, setRetryUnoptimized] = useState(false);

  if (resolvedUrl || (item.imageUrl && !imageError)) {
    if (isExport && resolvedUrl) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={resolvedUrl}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover"
          decoding="sync"
        />
      );
    }
    return (
      <Image
        src={item.imageUrl!}
        alt={item.title}
        fill
        sizes="112px"
        priority={priority}
        unoptimized={retryUnoptimized}
        className="object-cover pointer-events-none"
        onError={() => {
          if (!retryUnoptimized) {
            setRetryUnoptimized(true);
          } else {
            if (item.imageUrl) failedImages.add(item.imageUrl);
            setImageError(true);
          }
        }}
      />
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 text-neutral-600 p-2 overflow-hidden">
      <TypeIcon size={24} className="mb-1 opacity-50" />
      {isExport && (
        <span className="text-[9px] text-center leading-tight uppercase font-black opacity-30 mt-1 line-clamp-2 px-1">
          {item.title}
        </span>
      )}
      <span className="text-[7px] text-center leading-tight uppercase font-bold opacity-20 mt-1">
        {item.type}
      </span>
    </div>
  );
}

function MediaCardOverlay({
  item,
  isExport,
  line2,
  line3,
}: {
  item: MediaItem;
  isExport: boolean;
  line2: string;
  line3: string;
}) {
  return (
    <div
      className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/100 via-black/90 to-transparent px-1.5 pb-1 pt-8 ${isExport ? 'z-10' : ''}`}
    >
      <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight mb-0.5">
        {item.title}
      </p>

      {line2 && (
        <p
          className={`text-[9px] line-clamp-2 leading-tight ${line3 ? 'text-neutral-200 mb-0.5' : 'text-neutral-400'}`}
        >
          {line2}
        </p>
      )}

      {line3 && <p className="text-[9px] text-neutral-400 line-clamp-2 leading-tight">{line3}</p>}
    </div>
  );
}

/**
 * The pure presentation component for a media item.
 * Handles rendering of the cover art, labels, and interaction buttons (remove, locate).
 */
function BaseMediaCard({
  item,
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
}: BaseMediaCardProps) {
  const interaction = useInteraction();
  const { Icon: TypeIcon, getSubtitle, getTertiaryText } = getMediaUI(item.type);

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-28 h-28 bg-blue-500/10 border-2 border-dashed border-blue-500/50 rounded-md z-0"
      />
    );
  }

  // Construct lines of info
  const line2 = getSubtitle(item);
  const line3 = getTertiaryText(item);

  // When exporting, use a simplified non-interactive container
  const containerClassName = `
    relative group/card w-28 h-28 bg-neutral-800 rounded-md overflow-hidden shadow-sm touch-pan-y select-none
    ${
      isExport
        ? 'flex-shrink-0 z-0'
        : isAdded
          ? 'opacity-50 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:opacity-100 grayscale hover:grayscale-0'
          : 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-neutral-400'
    }
  `;

  return (
    <div
      ref={setNodeRef}
      id={domId || `media-card-${item.id}`} // DOM ID for scrolling
      style={style}
      {...listeners}
      {...attributes}
      onClick={!isExport && isAdded && onLocate ? onLocate : undefined}
      onMouseEnter={!isExport ? () => interaction?.setHoveredItem({ item, tierId }) : undefined}
      onMouseLeave={!isExport ? () => interaction?.setHoveredItem(null) : undefined}
      className={containerClassName}
    >
      <MediaCardImage
        item={item}
        isExport={isExport}
        resolvedUrl={resolvedUrl}
        priority={priority}
        TypeIcon={TypeIcon}
      />

      <MediaCardOverlay item={item} isExport={isExport} line2={line2} line3={line3} />

      {/* Added Indicator / Locate Overlay */}
      {isAdded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none">
          <Eye className="text-white drop-shadow-md" size={24} />
        </div>
      )}

      {/* Delete Button (Only if in a tier) */}
      {tierId && onRemove && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity"
          title="Remove item"
        >
          <X size={12} />
        </button>
      )}

      {/* Info Button */}
      {onInfo && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onInfo(item);
          }}
          className="absolute top-1 left-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded-full p-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity"
          title="View details"
        >
          <Info size={12} />
        </button>
      )}

      {/* Type Badge (Only if no info button and no image) */}
      {!item.imageUrl && !onInfo && (
        <div className="absolute top-1 left-1 text-neutral-500 opacity-50">
          <TypeIcon size={10} />
        </div>
      )}
    </div>
  );
}

/**
 * Public props for the MediaCard and SortableMediaCard components.
 */
interface MediaCardProps {
  /** The media data object (Album, Artist, or Song). */
  item: MediaItem;
  /** Optional override for the draggable ID. Defaults to item.id. */
  id?: string;
  /** The ID of the tier this card belongs to, if any. */
  tierId?: string;
  /** Callback to remove this item from its tier. */
  onRemove?: (id: string) => void;
  /** Whether this item is already present on the board (used in Search results). */
  isAdded?: boolean;
  /** Callback to locate this item on the board. */
  onLocate?: (id: string) => void;
  /** Whether to prioritize loading the image (eager load). Defaults to false. */
  priority?: boolean;
  /** Callback to show details */
  onInfo?: (item: MediaItem) => void;
  /** Whether the component is being rendered for a screenshot export. */
  isExport?: boolean;
  /** A pre-resolved Data URL for the image. */
  resolvedUrl?: string;
}

/**
 * A Draggable media card component.
 * Used primarily in the Search Panel where items can be dragged FROM but not sorted within.
 */
export function MediaCard(props: MediaCardProps) {
  const draggableId = props.id || props.item.id;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: { mediaItem: props.item, sourceTier: props.tierId },
    disabled: props.isAdded,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <BaseMediaCard
      {...props}
      domId={`media-card-${draggableId}`}
      setNodeRef={setNodeRef}
      style={style}
      attributes={attributes}
      listeners={listeners}
      isDragging={isDragging}
      onLocate={() => props.onLocate?.(props.item.id)}
      isExport={props.isExport}
      resolvedUrl={props.resolvedUrl}
    />
  );
}

/**
 * A Sortable media card component.
 * Used within Tier Rows where items can be reordered (sorted) relative to each other.
 */
export function SortableMediaCard(props: MediaCardProps) {
  const draggableId = props.id || props.item.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: draggableId,
    data: { mediaItem: props.item, sourceTier: props.tierId },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <BaseMediaCard
      {...props}
      domId={`media-card-${draggableId}`}
      setNodeRef={setNodeRef}
      style={style}
      attributes={attributes}
      listeners={listeners}
      isDragging={isDragging}
      onLocate={props.onLocate ? () => props.onLocate!(props.item.id) : undefined}
      isExport={props.isExport}
      resolvedUrl={props.resolvedUrl}
    />
  );
}
