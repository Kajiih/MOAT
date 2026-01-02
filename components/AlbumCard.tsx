import Image from 'next/image';
import { useDraggable } from '@dnd-kit/core';
import { Album } from '@/lib/types';
import { X } from 'lucide-react'; // Icon library

interface AlbumCardProps {
  album: Album;
  tierId?: string; // If present, card is in a tier (show delete button)
  onRemove?: (id: string) => void;
}

export function AlbumCard({ album, tierId, onRemove }: AlbumCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: album.id,
    data: { album, sourceTier: tierId }, // Pass data for drag events
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="w-24 h-24 bg-neutral-800/50 border-2 border-dashed border-neutral-600 rounded-md opacity-50" />;
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes} 
      className="relative group w-24 h-24 bg-neutral-800 rounded-md cursor-grab active:cursor-grabbing overflow-hidden shadow-sm hover:ring-2 hover:ring-neutral-400 transition-all"
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

      {/* Delete Button (Only if in a tier) */}
      {tierId && onRemove && (
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag start
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
