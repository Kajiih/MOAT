'use client';

import { useState, useMemo } from 'react';
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
import { MediaItem, TierListState, TierDefinition } from '@/lib/types';
import { MediaCard } from '@/components/MediaCard';
import { TierRow } from '@/components/TierRow';
import { Header } from '@/components/Header';
import { SearchPanel } from '@/components/SearchPanel';
import { Plus, Dices } from 'lucide-react';
import { TIER_COLORS } from '@/lib/colors';
import { usePersistentState } from '@/lib/hooks';

const INITIAL_STATE: TierListState = {
  tierDefs: [
    { id: 'S', label: 'S', color: 'red' },
    { id: 'A', label: 'A', color: 'orange' },
    { id: 'B', label: 'B', color: 'amber' },
    { id: 'C', label: 'C', color: 'green' },
    { id: 'D', label: 'D', color: 'blue' },
    { id: 'Unranked', label: 'Unranked', color: 'neutral' },
  ],
  items: { S: [], A: [], B: [], C: [], D: [], Unranked: [] }
};

const LOCAL_STORAGE_KEY = 'kj-tierlist';

export default function TierListApp() {
  // App State managed by custom hook. Synchronous on client.
  const [state, setState] = usePersistentState<TierListState>(LOCAL_STORAGE_KEY, INITIAL_STATE);
  
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [activeTier, setActiveTier] = useState<TierDefinition | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
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

  // --- Dynamic Header Colors ---
  const headerColors = useMemo(() => {
    // If not dragging a tier, or not over anything, return current state
    if (!activeTier || !overId) {
        return state.tierDefs.slice(0, 4).map(t => t.color);
    }

    // Determine projected order
    const oldIndex = state.tierDefs.findIndex(t => t.id === activeTier.id);
    const newIndex = state.tierDefs.findIndex(t => t.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
        // Create a temporary array reflecting the move
        const projectedDefs = arrayMove(state.tierDefs, oldIndex, newIndex);
        return projectedDefs.slice(0, 4).map(t => t.color);
    }
    
    return state.tierDefs.slice(0, 4).map(t => t.color);
  }, [state.tierDefs, activeTier, overId]);


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
            if (parsed && 'tierDefs' in parsed) {
                setState(parsed);
            } else {
                alert("Invalid JSON file: missing tier definitions");
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
    const availableColors = TIER_COLORS.filter(c => !usedColors.has(c.id));
    
    // Pick from available, or just random if all used
    const randomColorObj = availableColors.length > 0 
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : TIER_COLORS[Math.floor(Math.random() * TIER_COLORS.length)];

    const newTier: TierDefinition = {
        id: newId,
        label: 'New Tier',
        color: randomColorObj.id
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
            return { ...tier, color: color.id };
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
    
    // Track where we are hovering for dynamic header colors
    setOverId(over?.id as string || null);
    
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
    setOverId(null); // Reset hover tracking

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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans relative">
      <div className="max-w-[1600px] mx-auto">
        <Header 
            onImport={handleImport} 
            onExport={handleExport} 
            onClear={handleClear} 
            colors={headerColors}
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

      {/* Floating Randomize Colors Button */}
      <button 
        onClick={handleRandomizeColors} 
        className="fixed bottom-8 right-8 p-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group z-50"
        title="Randomize Colors"
      >
          <Dices size={24} className="group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );
}
