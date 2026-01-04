import Image from 'next/image';
import { useDraggable, DraggableAttributes } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaItem } from '@/lib/types';
import { X, Eye, Music, User, Disc, Info } from 'lucide-react'; 
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

/**
 * Props for the visual representation of a media card.
 */
interface BaseMediaCardProps {
  item: MediaItem;
  tierId?: string;
  onRemove?: (id: string) => void;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  attributes?: DraggableAttributes;
  listeners?: SyntheticListenerMap;
  isDragging?: boolean;
  isAdded?: boolean;
  onLocate?: () => void;
  domId?: string;
  priority?: boolean;
  onInfo?: (item: MediaItem) => void;
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
  onInfo
}: BaseMediaCardProps) {
  
  // Icon based on type
  const TypeIcon = item.type === 'artist' ? User : item.type === 'song' ? Music : Disc;

  if (isDragging) {
    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="w-24 h-24 bg-blue-500/10 border-2 border-dashed border-blue-500/50 rounded-md z-0" 
        />
    );
  }

  // Construct subtitle
  let subtitle = '';
  if (item.type === 'artist') {
      const parts = [];
      if (item.disambiguation) parts.push(`(${item.disambiguation})`);
      if (item.year) parts.push(`Est. ${item.year}`);
      subtitle = parts.length > 0 ? parts.join(' ') : 'Artist';
  } else {
      // Album or Song
      subtitle = `${item.artist || 'Unknown'} ${item.year ? `(${item.year})` : ''}`;
  }

  return (
    <div 
      ref={setNodeRef} 
      id={domId || `media-card-${item.id}`} // DOM ID for scrolling
      style={style} 
      {...listeners} 
      {...attributes} 
      onClick={isAdded && onLocate ? onLocate : undefined}
      className={`
        relative group/card w-24 h-24 bg-neutral-800 rounded-md overflow-hidden shadow-sm transition-all touch-none select-none
        ${isAdded 
            ? 'opacity-50 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:opacity-100 grayscale hover:grayscale-0' 
            : 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-neutral-400'
        }
      `}
    >
      {item.imageUrl ? (
        <Image 
          src={item.imageUrl} 
          alt={item.title} 
          fill 
          sizes="96px"
          priority={priority}
          className="object-cover pointer-events-none" 
          onError={(e) => { 
            // If image fails, hide it and show placeholder
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-800 text-neutral-600 p-2">
            <TypeIcon size={24} className="mb-1 opacity-50" />
            <span className="text-[9px] text-center leading-tight uppercase font-bold opacity-40">{item.type}</span>
        </div>
      )}
      
      {/* Overlay Info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-1 pt-5">
        <p className="text-[10px] font-bold text-white truncate leading-tight">{item.title}</p>
        
        {/* Subtitle logic varies by type */}
        <p className="text-[9px] text-neutral-400 truncate">
            {subtitle}
        </p>
      </div>

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
    disabled: props.isAdded 
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

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
    />
  );
}

/**
 * A Sortable media card component.
 * Used within Tier Rows where items can be reordered (sorted) relative to each other.
 */
export function SortableMediaCard(props: MediaCardProps) {
    const draggableId = props.id || props.item.id;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: draggableId,
        data: { mediaItem: props.item, sourceTier: props.tierId }
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
      />
    );
}