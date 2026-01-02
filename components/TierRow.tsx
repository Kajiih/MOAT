'use client';

import { useMemo } from 'react';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { MediaItem } from '@/lib/types';
import { SortableAlbumCard } from '@/components/AlbumCard';

const TIER_COLORS: Record<string, string> = {
  S: 'bg-red-500', A: 'bg-orange-500', B: 'bg-yellow-500', C: 'bg-green-500', D: 'bg-blue-500'
};

interface TierRowProps {
  id: string;
  albums: MediaItem[];
  onRemove: (id: string) => void;
}

export function TierRow({ id, albums, onRemove }: TierRowProps) {
  const { setNodeRef } = useDroppable({ 
    id,
    data: { isTierContainer: true } 
  });

  const { over } = useDndContext();

  const isOverRow = useMemo(() => {
    if (!over) return false;
    if (over.id === id) return true;
    return albums.some(a => a.id === over.id);
  }, [over, id, albums]);

  return (
    <div className={`flex bg-neutral-900 border min-h-[7rem] mb-2 overflow-hidden rounded-lg transition-colors duration-200 ${isOverRow ? 'border-neutral-500 bg-neutral-800' : 'border-neutral-800'}`}>
      <div className={`w-24 flex items-center justify-center text-3xl font-black text-black select-none ${TIER_COLORS[id]}`}>
        {id}
      </div>
      <div 
        ref={setNodeRef} 
        className="flex-1 flex flex-wrap items-center gap-2 p-3 relative"
      >
        {isOverRow && <div className="absolute inset-0 bg-white/5 pointer-events-none" />}
        <SortableContext id={id} items={albums.map(a => a.id)} strategy={rectSortingStrategy}>
          {albums.map((item) => {
            return (
              <SortableAlbumCard 
                key={item.id} 
                item={item} 
                id={item.id} 
                tierId={id} 
                onRemove={(albId) => onRemove(albId)} 
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}
