import Image from 'next/image';
import { useDraggable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Album } from '@/lib/types';
import { X, Eye } from 'lucide-react'; 

interface BaseAlbumCardProps {
  album: Album;
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
  album, 
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
  
  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="w-24 h-24 bg-neutral-800/50 border-2 border-dashed border-neutral-600 rounded-md opacity-50 z-50" />;
  }

  return (
    <div 
      ref={setNodeRef} 
      id={domId || `album-card-${album.id}`} // DOM ID for scrolling
      style={style} 
      {...listeners} 
      {...attributes} 
      onClick={isAdded && onLocate ? onLocate : undefined}
      className={`
        relative group w-24 h-24 bg-neutral-800 rounded-md overflow-hidden shadow-sm transition-all touch-none
        ${isAdded 
            ? 'opacity-50 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:opacity-100 grayscale hover:grayscale-0' 
            : 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-neutral-400'
        }
      `}
    >
      <Image 
        src={album.imageUrl} 
        alt={album.title} 
        fill 
        sizes="96px"
        className="object-cover pointer-events-none" 
        onError={(e) => { e.currentTarget.src = 'https://placehold.co/100/262626/FFF?text=No+Art'; }}
      />
      
      {/* Overlay Info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1 pt-4">
        <p className="text-[10px] font-bold text-white truncate">{album.title}</p>
        <p className="text-[9px] text-neutral-300 truncate">{album.artist} {album.year ? `(${album.year})` : ''}</p>
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
            onRemove(album.id);
          }}
          className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

interface AlbumCardProps {
  album: Album;
  id?: string; // Explicit ID for dnd-kit
  tierId?: string;
  onRemove?: (id: string) => void;
  isAdded?: boolean;
  onLocate?: (id: string) => void;
}

export function AlbumCard(props: AlbumCardProps) {
  // Use explicit ID if provided, otherwise fallback to album.id
  const draggableId = props.id || props.album.id;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: { album: props.album, sourceTier: props.tierId },
    disabled: props.isAdded // Disable drag if already added
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <BaseAlbumCard 
      {...props} 
      domId={`album-card-${draggableId}`}
      setNodeRef={setNodeRef} 
      style={style} 
      attributes={attributes} 
      listeners={listeners} 
      isDragging={isDragging}
      onLocate={() => props.onLocate?.(props.album.id)}
    />
  );
}

export function SortableAlbumCard(props: AlbumCardProps) {
    const draggableId = props.id || props.album.id;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: draggableId,
        data: { album: props.album, sourceTier: props.tierId }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
      <BaseAlbumCard 
        {...props} 
        domId={`album-card-${draggableId}`}
        setNodeRef={setNodeRef} 
        style={style} 
        attributes={attributes} 
        listeners={listeners} 
        isDragging={isDragging} 
        onLocate={props.onLocate ? () => props.onLocate!(props.album.id) : undefined}
      />
    );
}