'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  DragOverEvent,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  sortableKeyboardCoordinates, 
} from '@dnd-kit/sortable';
import { MediaItem, TierMap } from '@/lib/types';
import { MediaCard } from '@/components/MediaCard';
import { TierRow } from '@/components/TierRow';
import { Header } from '@/components/Header';
import { SearchPanel } from '@/components/SearchPanel';

const INITIAL_TIERS: TierMap = { S: [], A: [], B: [], C: [], D: [], Unranked: [] };
const LOCAL_STORAGE_KEY = 'kj-tierlist';

/**
 * The main application component for TierMaster.
 * 
 * Responsibilities:
 * 1. Manages the global state of the tier list (items in S, A, B...).
 * 2. Handles local storage persistence (loading on mount, saving on change).
 * 3. Orchestrates the Drag and Drop context (`DndContext`) for the entire application.
 * 4. Coordinates complex drag logic (adding from search, moving between tiers, reordering).
 */
export default function TierListApp() {
  const [isMounted, setIsMounted] = useState(false);
  const hasLoadedSaved = useRef(false);

  // App State
  const [tiers, setTiers] = useState<TierMap>(INITIAL_TIERS);
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  
  const addedItemIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(tiers).forEach(tierList => {
        tierList.forEach(item => {
            const cleanId = item.id.replace(/^search-/, '');
            ids.add(cleanId);
        });
    });
    return ids;
  }, [tiers]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
              setTiers(prev => ({ ...INITIAL_TIERS, ...parsed }));
            }
            setIsMounted(true);
        }, 0);

        hasLoadedSaved.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tiers));
  }, [tiers, isMounted]);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tiers));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `tierlist-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const parsed = JSON.parse(ev.target?.result as string);
            setTiers({ ...INITIAL_TIERS, ...parsed }); 
        } catch { alert("Invalid JSON file"); }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if(confirm("Clear everything?")) setTiers(INITIAL_TIERS);
  };

  const removeItemFromTier = (tierId: string, itemId: string) => {
    setTiers(prev => ({
        ...prev,
        [tierId]: prev[tierId].filter(a => a.id !== itemId && a.id !== `search-${itemId}`)
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

  const findContainer = (id: string) => {
    if (id in tiers) return id;
    return Object.keys(tiers).find((key) => tiers[key].find((a) => a.id === id));
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveItem(e.active.data.current?.mediaItem);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    const activeTierId = event.active.data.current?.sourceTier;
    
    if (!over) return;

    const activeId = event.active.id;
    const overId = over.id;

    const activeContainer = activeTierId || findContainer(activeId as string); 
    const overContainer = findContainer(overId as string);

    if (!overContainer) {
        return; 
    }

    if (!activeContainer) {
        const cleanId = event.active.data.current?.mediaItem.id;
        if (addedItemIds.has(cleanId)) return; 

        setTiers((prev) => {
            const activeItem = event.active.data.current?.mediaItem;
            if(!activeItem) return prev;

            const overItems = prev[overContainer];
            const overIndex = overItems.findIndex((item) => item.id === overId);
            
            let newIndex;
            if (overId in prev) {
                newIndex = overItems.length + 1;
            } else {
                const isBelowOverItem =
                  over &&
                  event.active.rect.current.translated &&
                  event.active.rect.current.translated.top > over.rect.top + over.rect.height;
                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            const tempItem = { ...activeItem, id: activeId as string };

            return {
                ...prev,
                [overContainer]: [
                    ...prev[overContainer].slice(0, newIndex),
                    tempItem,
                    ...prev[overContainer].slice(newIndex, prev[overContainer].length),
                ],
            };
        });
        return;
    }

    if (activeContainer === overContainer) {
        setTiers((prev) => {
            const activeItems = prev[activeContainer];
            const overItems = prev[overContainer];
            const activeIndex = activeItems.findIndex((item) => item.id === activeId);
            const overIndex = overItems.findIndex((item) => item.id === overId);
            
            if (activeIndex !== overIndex) {
                 return {
                    ...prev,
                    [activeContainer]: arrayMove(prev[activeContainer], activeIndex, overIndex),
                 };
            }
            return prev;
        });
        return;
    }

    setTiers((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((item) => item.id === activeId);
      const overIndex = overItems.findIndex((item) => item.id === overId);

      let newIndex;
      if (overId in prev) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over &&
          event.active.rect.current.translated &&
          event.active.rect.current.translated.top > over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        [activeContainer]: [
          ...prev[activeContainer].filter((item) => item.id !== activeId),
        ],
        [overContainer]: [
          ...prev[overContainer].slice(0, newIndex),
          activeItems[activeIndex],
          ...prev[overContainer].slice(newIndex, prev[overContainer].length),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    setActiveItem(null);

    setTiers(prev => {
        const next = { ...prev };
        let modified = false;

        Object.keys(next).forEach(key => {
            const list = next[key];
            const needsFix = list.some(a => a.id.startsWith('search-'));
            
            if (needsFix) {
                next[key] = list.map(a => {
                    if (a.id.startsWith('search-')) {
                        const originalId = a.id.replace('search-', '');
                        return { ...a, id: originalId };
                    }
                    return a;
                });
                modified = true;
            }
        });

        return modified ? next : prev;
    });

    if (!over) return;
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-black tracking-tighter text-white animate-pulse">
            TIER<span className="text-red-600">MASTER</span>
        </h1>
        <div className="text-neutral-500 text-sm">Loading application...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        <Header onImport={handleImport} onExport={handleExport} onClear={handleClear} />

        <DndContext 
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart} 
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
                <div className="space-y-2">
                    {Object.keys(tiers).map(tier => (
                        <TierRow 
                            key={tier} 
                            id={tier} 
                            items={tiers[tier]} 
                            onRemove={(itemId) => removeItemFromTier(tier, itemId)} 
                        />
                    ))}
                </div>

                <SearchPanel 
                    addedItemIds={addedItemIds}
                    onLocate={handleLocate}
                />
            </div>

            <DragOverlay>
                {activeItem ? <MediaCard item={activeItem} /> : null}
            </DragOverlay>

        </DndContext>
      </div>
    </div>
  );
}
