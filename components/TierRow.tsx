'use client';

import { useMemo, useState, useRef, useEffect, memo } from 'react';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaItem, TierDefinition } from '@/lib/types';
import { SortableMediaCard } from '@/components/MediaCard';
import { Settings, Trash2, GripVertical } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { TIER_COLORS, getColorTheme } from '@/lib/colors';

interface TierRowProps {
  tier: TierDefinition;
  items: MediaItem[];
  onRemoveItem: (itemId: string) => void;
  onUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
  onDeleteTier: (id: string) => void;
  canDelete: boolean;
  isAnyDragging?: boolean;
  onInfo: (item: MediaItem) => void;
}

export const TierRow = memo(function TierRow({
  tier,
  items,
  onRemoveItem,
  onUpdateTier,
  onDeleteTier,
  canDelete,
  isAnyDragging,
  onInfo
}: TierRowProps) {
  // Resolve the full color theme from the ID
  const tierTheme = getColorTheme(tier.color);

  // Sortable logic for the Tier itself
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isDraggingTier,
  } = useSortable({
    id: tier.id,
    data: {
        type: 'tier',
        tier
    }
  });

  // Droppable logic for items being dropped into the tier
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: tier.id,
    data: {
        isTierContainer: true,
        type: 'tier'
    }
  });

  // Combine refs
  const setCombinedRef = (node: HTMLDivElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const { over, active } = useDndContext();
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [labelInput, setLabelInput] = useState(tier.label);
  const [prevLabel, setPrevLabel] = useState(tier.label);

  const settingsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (tier.label !== prevLabel) {
    setPrevLabel(tier.label);
    setLabelInput(tier.label);
  }

  const isOverRow = useMemo(() => {
    if (!over) return false;
    // Don't highlight if we are dragging a tier
    if (active?.data.current?.type === 'tier') return false;

    if (over.id === tier.id) return true;
    return items.some(a => a.id === over.id);
  }, [over, active, tier.id, items]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
      setLabelInput(tier.label);
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
        ref={setCombinedRef}
        style={style}
        className={twMerge(
            "flex bg-neutral-900 border min-h-[7rem] mb-2 rounded-lg transition-all duration-200 ease-out relative",
            isOverRow
                ? 'border-blue-500/50 bg-neutral-800 scale-[1.01] shadow-lg ring-1 ring-blue-500/30 z-20'
                : 'border-neutral-800',
            showSettings ? 'z-30' : 'z-0',
            isDraggingTier && "opacity-50 border-blue-500 ring-2 ring-blue-500/50 scale-95"
        )}
    >
      {/* Label / Header Column */}
      <div
        className={twMerge(
            "w-24 md:w-32 flex flex-col items-center justify-center p-2 relative shrink-0 transition-colors rounded-l-lg group/row",
            tierTheme.bg // Apply the background class from the theme
        )}
      >
        {/* Drag Handle */}
        <div
            {...attributes}
            {...listeners}
            className={twMerge(
                "absolute top-1 left-1 p-1 transition-opacity cursor-grab active:cursor-grabbing text-black/40 hover:text-black",
                isAnyDragging ? "opacity-0 pointer-events-none" : "opacity-0 group-hover/row:opacity-100"
            )}
        >
            <GripVertical size={16} />
        </div>

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
            className={twMerge(
                "absolute bottom-1 right-1 p-1 transition-opacity bg-black/20 hover:bg-black/40 rounded text-black",
                isAnyDragging ? "opacity-0 pointer-events-none" : "opacity-0 group-hover/row:opacity-100"
            )}
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
                        {TIER_COLORS.map(c => (
                            <button
                                key={c.id}
                                title={c.label}
                                className={twMerge(
                                    "w-6 h-6 rounded-full border border-transparent hover:scale-110 transition-transform",
                                    c.bg,
                                    tier.color === c.id && "border-white ring-1 ring-white"
                                )}
                                onClick={() => onUpdateTier(tier.id, { color: c.id })}
                            />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                    {canDelete && (
                        <button
                            onClick={() => { if(confirm('Delete tier?')) onDeleteTier(tier.id); }}
                            className="flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 rounded p-1 text-xs mt-1"
                        >
                            <Trash2 size={14} /> Delete Tier
                        </button>
                    )}
                    <div className="text-[10px] text-neutral-600 text-center mt-2">
                        Tip: Drag the grip handle on the left to reorder
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Items Column */}
      <div
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
                onInfo={onInfo}
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
});