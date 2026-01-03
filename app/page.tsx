'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  DragStartEvent, 
  DragOverEvent,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  sortableKeyboardCoordinates, 
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { MediaItem, TierListState, TierDefinition, LegacyTierMap } from '@/lib/types';
import { MediaCard } from '@/components/MediaCard';
import { TierRow } from '@/components/TierRow';
import { Header } from '@/components/Header';
import { SearchPanel } from '@/components/SearchPanel';
import { Plus } from 'lucide-react';
import { TIER_COLORS, getTextColor } from '@/lib/colors';

const INITIAL_STATE: TierListState = {
  tierDefs: [
    { id: 'S', label: 'S', color: 'bg-red-500' },
    { id: 'A', label: 'A', color: 'bg-orange-500' },
    { id: 'B', label: 'B', color: 'bg-amber-400' },
    { id: 'C', label: 'C', color: 'bg-green-500' },
    { id: 'D', label: 'D', color: 'bg-blue-500' },
    { id: 'Unranked', label: 'Unranked', color: 'bg-neutral-500' },
  ],
  items: { S: [], A: [], B: [], C: [], D: [], Unranked: [] }
};

const LOCAL_STORAGE_KEY = 'kj-tierlist';

export default function TierListApp() {
  const [isMounted, setIsMounted] = useState(false);
  const hasLoadedSaved = useRef(false);

  // App State
  const [state, setState] = useState<TierListState>(INITIAL_STATE);
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [activeTier, setActiveTier] = useState<TierDefinition | null>(null);
  
  const addedItemIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(state.items).forEach(tierList => {
        tierList.forEach(item => {
            const cleanId = item.id.replace(/^search-/, '');
            ids.add(cleanId);
        });
    });
    return ids;
  }, [state.items]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Persistence & Migration ---

  useEffect(() => { 
    if (!hasLoadedSaved.current) {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        let parsed = null;
        if (saved) {
            try { 
                parsed = JSON.parse(saved);
            } catch (e) { 
                console.error("Save Corrupt", e); 
            }
        }
        
        setTimeout(() => {
            if (parsed) {
                if (!('tierDefs' in parsed)) {
                    console.log("Migrating legacy data...");
                    const legacy = parsed as LegacyTierMap;
                    const items: Record<string, MediaItem[]> = { ...INITIAL_STATE.items };
                    
                    Object.keys(legacy).forEach(key => {
                        if (key in items) {
                            items[key] = legacy[key];
                        } else {
                            items['Unranked'] = [...items['Unranked'], ...legacy[key]];
                        }
                    });
                    
                    setState({ ...INITIAL_STATE, items });
                } else {
                    setState(parsed);
                }
            }
            setIsMounted(true);
        }, 0);

        hasLoadedSaved.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state, isMounted]);

  // --- Actions ---

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `moat-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const parsed = JSON.parse(ev.target?.result as string);
             if (!('tierDefs' in parsed)) {
                const legacy = parsed as LegacyTierMap;
                const items: Record<string, MediaItem[]> = { ...INITIAL_STATE.items };
                Object.keys(legacy).forEach(key => {
                    if (key in items) items[key] = legacy[key];
                    else items['Unranked'] = [...items['Unranked'], ...legacy[key]];
                });
                setState({ ...INITIAL_STATE, items });
             } else {
                setState(parsed);
             }
        } catch { alert("Invalid JSON file"); }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if(confirm("Clear everything?")) setState(INITIAL_STATE);
  };

  // --- Tier Management ---

  const handleAddTier = () => {
    const newId = crypto.randomUUID();
    
    // Find a color that isn't used yet
    const usedColors = new Set(state.tierDefs.map(t => t.color));
    const availableColors = TIER_COLORS.filter(c => !usedColors.has(c.bg));
    
    // Pick from available, or just random if all used
    const randomColorObj = availableColors.length > 0 
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : TIER_COLORS[Math.floor(Math.random() * TIER_COLORS.length)];

    const newTier: TierDefinition = {
        id: newId,
        label: 'New Tier',
        color: randomColorObj.bg
    };
    
    setState(prev => ({
        tierDefs: [...prev.tierDefs, newTier],
        items: { ...prev.items, [newId]: [] }
    }));
  };

  const handleRandomizeColors = () => {
    setState(prev => {
        let pool = [...TIER_COLORS];
        
        const newDefs = prev.tierDefs.map(tier => {
            if (pool.length === 0) pool = [...TIER_COLORS];
            const index = Math.floor(Math.random() * pool.length);
            const color = pool[index];
            pool.splice(index, 1);
            return { ...tier, color: color.bg };
        });

        return { ...prev, tierDefs: newDefs };
    });
  };

  const handleUpdateTier = (id: string, updates: Partial<TierDefinition>) => {
    setState(prev => ({
        ...prev,
        tierDefs: prev.tierDefs.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const handleDeleteTier = (id: string) => {
    setState(prev => {
        const tierIndex = prev.tierDefs.findIndex(t => t.id === id);
        if (tierIndex === -1) return prev;

        const fallbackId = prev.tierDefs.find(t => t.id !== id)?.id;
        
        const orphanedItems = prev.items[id] || [];
        const newItems = { ...prev.items };
        delete newItems[id];

        if (fallbackId && orphanedItems.length > 0) {
            newItems[fallbackId] = [...newItems[fallbackId], ...orphanedItems];
        }

        return {
            tierDefs: prev.tierDefs.filter(t => t.id !== id),
            items: newItems
        };
    });
  };

  const removeItemFromTier = (tierId: string, itemId: string) => {
    setState(prev => ({
        ...prev,
        items: {
            ...prev.items,
            [tierId]: prev.items[tierId].filter(a => a.id !== itemId && a.id !== `search-${itemId}`)
        }
    }));
  };

  const handleLocate = (id: string) => {
    const el = document.getElementById(`media-card-${id}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.3s';
        el.style.boxShadow = '0 0 20px 5px rgba(255, 255, 255, 0.5)';
        setTimeout(() => {
            el.style.boxShadow = '';
        }, 1500);
    } else {
        alert("Could not locate item on board.");
    }
  };

  // --- DnD Logic ---

  const findContainer = (id: string) => {
    if (id in state.items) return id;
    return Object.keys(state.items).find((key) => state.items[key].find((a) => a.id === id));
  };

  const handleDragStart = (e: DragStartEvent) => {
    const { active } = e;
    if (active.data.current?.type === 'tier') {
        setActiveTier(active.data.current.tier);
    } else {
        setActiveItem(active.data.current?.mediaItem);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (active.data.current?.type === 'tier') return;

    const activeTierId = active.data.current?.sourceTier;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeContainer = activeTierId || findContainer(activeId as string); 
    const overContainer = findContainer(overId as string);

    if (!overContainer) return;

    // 1. Dragging from Search Panel to Board
    if (!activeContainer) {
        const cleanId = active.data.current?.mediaItem.id;
        if (addedItemIds.has(cleanId)) return; 

        setState((prev) => {
            const activeItem = active.data.current?.mediaItem;
            if(!activeItem) return prev;

            const overItems = prev.items[overContainer];
            const overIndex = overItems.findIndex((item) => item.id === overId);
            
            let newIndex;
            if (overId in prev.items) {
                newIndex = overItems.length + 1;
            } else {
                const isBelowOverItem =
                  over &&
                  active.rect.current.translated &&
                  active.rect.current.translated.top > over.rect.top + over.rect.height;
                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            const tempItem = { ...activeItem, id: activeId as string };

            return {
                ...prev,
                items: {
                    ...prev.items,
                    [overContainer]: [
                        ...prev.items[overContainer].slice(0, newIndex),
                        tempItem,
                        ...prev.items[overContainer].slice(newIndex, prev.items[overContainer].length),
                    ],
                }
            };
        });
        return;
    }

    // 2. Dragging within same container
    if (activeContainer === overContainer) {
        setState((prev) => {
            const activeItems = prev.items[activeContainer];
            const overItems = prev.items[overContainer];
            const activeIndex = activeItems.findIndex((item) => item.id === activeId);
            const overIndex = overItems.findIndex((item) => item.id === overId);
            
            if (activeIndex !== overIndex) {
                 return {
                    ...prev,
                    items: {
                        ...prev.items,
                        [activeContainer]: arrayMove(prev.items[activeContainer], activeIndex, overIndex),
                    }
                 };
            }
            return prev;
        });
        return;
    }

    // 3. Dragging between containers
    setState((prev) => {
      const activeItems = prev.items[activeContainer];
      const overItems = prev.items[overContainer];
      const activeIndex = activeItems.findIndex((item) => item.id === activeId);
      const overIndex = overItems.findIndex((item) => item.id === overId);

      let newIndex;
      if (overId in prev.items) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        items: {
            ...prev.items,
            [activeContainer]: [
              ...prev.items[activeContainer].filter((item) => item.id !== activeId),
            ],
            [overContainer]: [
              ...prev.items[overContainer].slice(0, newIndex),
              activeItems[activeIndex],
              ...prev.items[overContainer].slice(newIndex, prev.items[overContainer].length),
            ],
        }
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setActiveTier(null);

    // Case 1: Tier Reordering
    if (active.data.current?.type === 'tier' && over) {
        if (active.id !== over.id) {
            setState((prev) => {
                const oldIndex = prev.tierDefs.findIndex((t) => t.id === active.id);
                const newIndex = prev.tierDefs.findIndex((t) => t.id === over.id);
                return {
                    ...prev,
                    tierDefs: arrayMove(prev.tierDefs, oldIndex, newIndex),
                };
            });
        }
        return;
    }

    // Case 2: Media Item (Clean IDs)
    setState(prev => {
        const nextItems = { ...prev.items };
        let modified = false;

        Object.keys(nextItems).forEach(key => {
            const list = nextItems[key];
            const needsFix = list.some(a => a.id.startsWith('search-'));
            
            if (needsFix) {
                nextItems[key] = list.map(a => {
                    if (a.id.startsWith('search-')) {
                        const originalId = a.id.replace('search-', '');
                        return { ...a, id: originalId };
                    }
                    return a;
                });
                modified = true;
            }
        });

        return modified ? { ...prev, items: nextItems } : prev;
    });
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-black tracking-tighter uppercase italic animate-pulse select-none flex">
            {INITIAL_STATE.tierDefs.slice(0, 4).map((tier, i) => {
                const letter = ['M', 'O', 'A', 'T'][i];
                const colorClass = getTextColor(tier.color);
                return <span key={tier.id} className={colorClass}>{letter}</span>;
            })}
        </h1>
        <div className="text-neutral-500 text-sm">Loading application...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        <Header 
            onImport={handleImport} 
            onExport={handleExport} 
            onClear={handleClear} 
            onRandomizeColors={handleRandomizeColors}
            colors={state.tierDefs.slice(0, 4).map(t => t.color)}
        />

        <DndContext 
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart} 
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <SortableContext 
                            items={state.tierDefs.map(t => t.id)} 
                            strategy={verticalListSortingStrategy}
                        >
                            {state.tierDefs.map((tier) => (
                                <TierRow 
                                    key={tier.id} 
                                    tier={tier}
                                    items={state.items[tier.id] || []} 
                                    onRemoveItem={(itemId) => removeItemFromTier(tier.id, itemId)} 
                                    onUpdateTier={handleUpdateTier}
                                    onDeleteTier={handleDeleteTier}
                                    canDelete={true}
                                    isAnyDragging={!!activeItem || !!activeTier}
                                />
                            ))}
                        </SortableContext>
                    </div>
                    
                    <button 
                        onClick={handleAddTier}
                        className="w-full py-3 border border-dashed border-neutral-700 rounded-lg text-neutral-500 hover:text-white hover:border-neutral-500 hover:bg-neutral-900 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                        <Plus size={20} /> Add Tier
                    </button>
                </div>

                <SearchPanel 
                    addedItemIds={addedItemIds}
                    onLocate={handleLocate}
                />
            </div>

            <DragOverlay>
                {activeTier ? (
                    <div className="w-full opacity-80 pointer-events-none">
                         <TierRow 
                            tier={activeTier} 
                            items={state.items[activeTier.id] || []}
                            onRemoveItem={() => {}}
                            onUpdateTier={() => {}}
                            onDeleteTier={() => {}}
                            canDelete={false}
                        />
                    </div>
                ) : activeItem ? (
                    <MediaCard item={activeItem} />
                ) : null}
            </DragOverlay>

        </DndContext>
      </div>
    </div>
  );
}
