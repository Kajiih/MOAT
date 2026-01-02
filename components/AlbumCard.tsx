import Image from 'next/image';
import { useDraggable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaItem } from '@/lib/types';
import { X, Eye, Music, User, Disc } from 'lucide-react'; 

interface BaseAlbumCardProps {
  item: MediaItem;
  tierId?: string;
  onRemove?: (id: string) => void;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  attributes?: any;
  listeners?: any;
  isDragging?: boolean;
  isAdded?: boolean;
  onLocate?: () => void;
  domId?: string;
}

function BaseAlbumCard({ 
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
  domId
}: BaseAlbumCardProps) {
  
  // Icon based on type
  const TypeIcon = item.type === 'artist' ? User : item.type === 'song' ? Music : Disc;

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="w-24 h-24 bg-neutral-800/50 border-2 border-dashed border-neutral-600 rounded-md opacity-50 z-50" />;
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
        relative group w-24 h-24 bg-neutral-800 rounded-md overflow-hidden shadow-sm transition-all touch-none select-none
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
          className="object-cover pointer-events-none" 
          onError={(e) => { 
            // If image fails, hide it and show placeholder
            e.currentTarget.style.display = 'none';
            // We can't easily trigger the fallback UI below from here without state, 
            // but hiding the broken image reveals the background which is OK for now.
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
            {item.type === 'artist' 
                ? (item.year ? `Est. ${item.year}` : 'Artist') 
                : `${item.artist || 'Unknown'} ${item.year ? `(${item.year})` : ''}`
            }
        </p>
      </div>

      {/* Added Indicator / Locate Overlay */}
      {isAdded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
          className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={12} />
        </button>
      )}
      
      {/* Type Badge (Optional, small icon in corner) */}
      {!item.imageUrl && (
         <div className="absolute top-1 left-1 text-neutral-500 opacity-50">
            <TypeIcon size={10} />
         </div>
      )}
    </div>
  );
}

interface AlbumCardProps {
  item: MediaItem; // Renamed from album to item
  id?: string;
  tierId?: string;
  onRemove?: (id: string) => void;
  isAdded?: boolean;
  onLocate?: (id: string) => void;
}

export function AlbumCard(props: AlbumCardProps) {
  const draggableId = props.id || props.item.id;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: { album: props.item, sourceTier: props.tierId }, // Keep data key as 'album' for now to minimize refactor or rename to 'item' later
    disabled: props.isAdded 
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <BaseAlbumCard 
      {...props} 
      domId={`media-card-${draggableId}`} // Updated ID prefix
      setNodeRef={setNodeRef} 
      style={style} 
      attributes={attributes} 
      listeners={listeners} 
      isDragging={isDragging}
      onLocate={() => props.onLocate?.(props.item.id)}
    />
  );
}

export function SortableAlbumCard(props: AlbumCardProps) {
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
        data: { album: props.item, sourceTier: props.tierId }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
      <BaseAlbumCard 
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