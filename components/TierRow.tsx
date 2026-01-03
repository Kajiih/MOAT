'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { MediaItem, TierDefinition } from '@/lib/types';
import { SortableMediaCard } from '@/components/MediaCard';
import { Settings, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export const TIER_COLOR_OPTIONS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-yellow-300', 'bg-lime-400',
  'bg-green-500', 'bg-teal-400', 'bg-cyan-400', 'bg-blue-500', 'bg-indigo-500', 
  'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-neutral-500', 'bg-slate-700'
];

interface TierRowProps {
  tier: TierDefinition;
  items: MediaItem[];
  onRemoveItem: (itemId: string) => void;
  onUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
  onDeleteTier: (id: string) => void;
  onMoveTierUp: (id: string) => void;
  onMoveTierDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  canDelete: boolean; // e.g., Unranked might be undeletable, or maybe not
}

export function TierRow({ 
  tier, 
  items, 
  onRemoveItem, 
  onUpdateTier, 
  onDeleteTier, 
  onMoveTierUp,
  onMoveTierDown,
  isFirst,
  isLast,
  canDelete
}: TierRowProps) {
  const { setNodeRef } = useDroppable({ 
    id: tier.id,
    data: { isTierContainer: true } 
  });

  const { over } = useDndContext();
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // State for the input value
  const [labelInput, setLabelInput] = useState(tier.label);
  // Track previous prop value to sync state if prop changes
  const [prevLabel, setPrevLabel] = useState(tier.label);

  const settingsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync local state if prop changes (State from props pattern)
  if (tier.label !== prevLabel) {
    setPrevLabel(tier.label);
    setLabelInput(tier.label);
  }

  const isOverRow = useMemo(() => {
    if (!over) return false;
    if (over.id === tier.id) return true;
    return items.some(a => a.id === over.id);
  }, [over, tier.id, items]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLabelSave = () => {
    if (labelInput.trim()) {
      onUpdateTier(tier.id, { label: labelInput.trim() });
    } else {
      setLabelInput(tier.label); // Revert if empty
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleLabelSave();
    }
    if (e.key === 'Escape') {
        setLabelInput(tier.label);
        setIsEditing(false);
    }
  };

  return (
    <div 
        className={twMerge(
            "flex bg-neutral-900 border min-h-[7rem] mb-2 rounded-lg transition-all duration-200 ease-out group relative",
            isOverRow 
                ? 'border-blue-500/50 bg-neutral-800 scale-[1.01] shadow-lg ring-1 ring-blue-500/30 z-20' 
                : 'border-neutral-800',
            showSettings ? 'z-30' : 'z-0'
        )}
    >
      {/* Label / Header Column */}
      <div 
        className={twMerge(
            "w-24 md:w-32 flex flex-col items-center justify-center p-2 relative shrink-0 transition-colors rounded-l-lg",
            tier.color
        )}
      >
        {isEditing ? (
            <textarea
                ref={inputRef}
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onBlur={handleLabelSave}
                onKeyDown={handleKeyDown}
                className="w-full h-full bg-white/20 text-black placeholder-black/50 text-center font-bold rounded resize-none focus:outline-none text-sm p-1 overflow-hidden"
                style={{ minHeight: '60px' }}
            />
        ) : (
            <div 
                onDoubleClick={() => setIsEditing(true)}
                className="w-full h-full flex items-center justify-center text-center font-black text-black select-none cursor-pointer hover:bg-black/5 rounded transition-colors break-words overflow-hidden"
                title="Double click to rename"
                style={{ fontSize: tier.label.length > 5 ? '1rem' : '1.75rem', lineHeight: '1.1' }}
            >
                {tier.label}
            </div>
        )}

        {/* Settings Button */}
        <button 
            onClick={() => setShowSettings(!showSettings)}
            className="absolute bottom-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 hover:bg-black/40 rounded text-black"
        >
            <Settings size={14} />
        </button>

        {/* Settings Popover */}
        {showSettings && (
            <div 
                ref={settingsRef}
                className="absolute top-0 left-0 w-[280px] z-50 bg-neutral-900 border border-neutral-700 shadow-2xl rounded-lg p-3 flex flex-col gap-3"
                style={{ transform: 'translate(10px, 10px)' }}
            >
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-xs font-bold text-neutral-400 uppercase">Tier Settings</span>
                    <button onClick={() => setShowSettings(false)} className="text-neutral-500 hover:text-white">✕</button>
                </div>
                
                {/* Colors */}
                <div>
                    <div className="text-xs text-neutral-500 mb-1">Color</div>
                    <div className="flex flex-wrap gap-1">
                        {TIER_COLOR_OPTIONS.map(c => (
                            <button
                                key={c}
                                className={twMerge(
                                    "w-6 h-6 rounded-full border border-transparent hover:scale-110 transition-transform",
                                    c,
                                    tier.color === c && "border-white ring-1 ring-white"
                                )}
                                onClick={() => onUpdateTier(tier.id, { color: c })}
                            />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                     <div className="flex gap-1">
                        <button 
                            disabled={isFirst}
                            onClick={() => onMoveTierUp(tier.id)}
                            className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 rounded p-1 text-xs"
                        >
                            <ArrowUp size={14} /> Up
                        </button>
                        <button 
                            disabled={isLast}
                            onClick={() => onMoveTierDown(tier.id)}
                            className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 rounded p-1 text-xs"
                        >
                            <ArrowDown size={14} /> Down
                        </button>
                    </div>
                    {canDelete && (
                        <button 
                            onClick={() => { if(confirm('Delete tier?')) onDeleteTier(tier.id); }}
                            className="flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded p-1 text-xs mt-1"
                        >
                            <Trash2 size={14} /> Delete Tier
                        </button>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Items Column */}
      <div 
        ref={setNodeRef} 
        className="flex-1 flex flex-wrap items-center gap-2 p-3 relative min-h-[100px]"
      >
        {isOverRow && <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />}
        <SortableContext id={tier.id} items={items.map(a => a.id)} strategy={rectSortingStrategy}>
          {items.map((item) => {
            return (
              <SortableMediaCard 
                key={item.id} 
                item={item} 
                id={item.id} 
                tierId={tier.id} 
                onRemove={(itemId) => onRemoveItem(itemId)} 
              />
            );
          })}
        </SortableContext>
        
        {items.length === 0 && (
            <div className="w-full h-full flex items-center justify-center text-neutral-800 text-sm font-medium italic pointer-events-none select-none opacity-50">
                {tier.label === 'Unranked' ? 'Drop items here...' : ''}
            </div>
        )}
      </div>
    </div>
  );
}