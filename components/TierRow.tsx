'use client';

import { useMemo } from 'react';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { MediaItem } from '@/lib/types';
import { SortableMediaCard } from '@/components/MediaCard';

const TIER_COLORS: Record<string, string> = {
  S: 'bg-red-500', 
  A: 'bg-orange-500', 
  B: 'bg-yellow-500', 
  C: 'bg-green-500', 
  D: 'bg-blue-500',
  Unranked: 'bg-neutral-500'
};

interface TierRowProps {
  id: string;
  items: MediaItem[];
  onRemove: (id: string) => void;
}

export function TierRow({ id, items, onRemove }: TierRowProps) {
  const { setNodeRef } = useDroppable({ 
    id,
    data: { isTierContainer: true } 
  });

  const { over } = useDndContext();

  const isOverRow = useMemo(() => {
    if (!over) return false;
    if (over.id === id) return true;
    return items.some(a => a.id === over.id);
  }, [over, id, items]);

  return (
    <div 
        className={`
            flex bg-neutral-900 border min-h-[7rem] mb-2 overflow-hidden rounded-lg transition-all duration-200 ease-out
            ${isOverRow 
                ? 'border-blue-500/50 bg-neutral-800 scale-[1.01] shadow-lg ring-1 ring-blue-500/30' 
                : 'border-neutral-800'
            }
        `}
    >
      <div className={`w-24 flex items-center justify-center font-black text-black select-none ${TIER_COLORS[id]} ${id === 'Unranked' ? 'text-sm px-1 text-center break-all' : 'text-3xl'}`}>
        {id}
      </div>
      <div 
        ref={setNodeRef} 
        className="flex-1 flex flex-wrap items-center gap-2 p-3 relative"
      >
        {isOverRow && <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />}
        <SortableContext id={id} items={items.map(a => a.id)} strategy={rectSortingStrategy}>
          {items.map((item) => {
            return (
              <SortableMediaCard 
                key={item.id} 
                item={item} 
                id={item.id} 
                tierId={id} 
                onRemove={(itemId) => onRemove(itemId)} 
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}
