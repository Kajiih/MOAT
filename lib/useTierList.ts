import { useState, useMemo, useCallback } from 'react';
import { 
  DragStartEvent, 
  DragOverEvent, 
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  sortableKeyboardCoordinates, 
} from '@dnd-kit/sortable';
import { MediaItem, TierListState, TierDefinition } from '@/lib/types';
import { TIER_COLORS } from '@/lib/colors';
import { usePersistentState } from '@/lib/hooks';
import { useToast } from '@/components/ToastProvider';

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

const LOCAL_STORAGE_KEY = 'moat-tierlist';

export function useTierList() {
  const [state, setState] = usePersistentState<TierListState>(LOCAL_STORAGE_KEY, INITIAL_STATE);
  
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [activeTier, setActiveTier] = useState<TierDefinition | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
  // State for Details Modal
  const [detailsItem, setDetailsItem] = useState<MediaItem | null>(null);
  
  const { showToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // --- Dynamic Header Colors ---
  const headerColors = useMemo(() => {
    if (!activeTier || !overId) {
        return state.tierDefs.slice(0, 4).map(t => t.color);
    }

    const oldIndex = state.tierDefs.findIndex(t => t.id === activeTier.id);
    const newIndex = state.tierDefs.findIndex(t => t.id === overId);

    if (oldIndex !== -1 && newIndex !== -1) {
        const projectedDefs = arrayMove(state.tierDefs, oldIndex, newIndex);
        return projectedDefs.slice(0, 4).map(t => t.color);
    }
    
    return state.tierDefs.slice(0, 4).map(t => t.color);
  }, [state.tierDefs, activeTier, overId]);

  // --- Actions ---

  const handleExport = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `moat-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showToast("Tier list exported successfully!", "success");
  }, [state, showToast]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const parsed = JSON.parse(ev.target?.result as string);
            if (parsed && 'tierDefs' in parsed) {
                setState(parsed);
                showToast("Tier list imported successfully!", "success");
            } else {
                showToast("Invalid JSON file: missing tier definitions", "error");
            }
        } catch { showToast("Invalid JSON file", "error"); }
    };
    reader.readAsText(file);
  }, [setState, showToast]);

  const handleClear = useCallback(() => {
    if(confirm("Clear everything?")) {
        setState(INITIAL_STATE);
        showToast("Board cleared", "info");
    }
  }, [setState, showToast]);

  // --- Details Modal Handlers ---
  const handleShowDetails = useCallback((item: MediaItem) => {
    setDetailsItem(item);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsItem(null);
  }, []);

  // --- Tier Management ---

  const handleAddTier = useCallback(() => {
    const newId = crypto.randomUUID();
    
    setState(prev => {
        const usedColors = new Set(prev.tierDefs.map(t => t.color));
        const availableColors = TIER_COLORS.filter(c => !usedColors.has(c.id));
        
        const randomColorObj = availableColors.length > 0 
            ? availableColors[Math.floor(Math.random() * availableColors.length)]
            : TIER_COLORS[Math.floor(Math.random() * TIER_COLORS.length)];

        const newTier: TierDefinition = {
            id: newId,
            label: 'New Tier',
            color: randomColorObj.id
        };

        return {
            tierDefs: [...prev.tierDefs, newTier],
            items: { ...prev.items, [newId]: [] }
        };
    });
  }, [setState]);

  const handleRandomizeColors = useCallback(() => {
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
    showToast("Colors randomized!", "success");
  }, [setState, showToast]);

  const handleUpdateTier = useCallback((id: string, updates: Partial<TierDefinition>) => {
    setState(prev => ({
        ...prev,
        tierDefs: prev.tierDefs.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  }, [setState]);

  const handleDeleteTier = useCallback((id: string) => {
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
  }, [setState]);

  const removeItemFromTier = useCallback((tierId: string, itemId: string) => {
    setState(prev => ({
        ...prev,
        items: {
            ...prev.items,
            [tierId]: prev.items[tierId].filter(a => a.id !== itemId && a.id !== `search-${itemId}`)
        }
    }));
  }, [setState]);

  const handleLocate = useCallback((id: string) => {
    const el = document.getElementById(`media-card-${id}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.3s';
        el.style.boxShadow = '0 0 20px 5px rgba(255, 255, 255, 0.5)';
        setTimeout(() => {
            el.style.boxShadow = '';
        }, 1500);
    } else {
        showToast("Could not locate item on board.", "error");
    }
  }, [showToast]);

  // --- DnD Logic ---

  // Helper function to find container (cannot be easily memoized without state dep)
  const findContainer = (id: string, currentItems: Record<string, MediaItem[]>) => {
    if (id in currentItems) return id;
    return Object.keys(currentItems).find((key) => currentItems[key].find((a) => a.id === id));
  };

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const { active } = e;
    if (active.data.current?.type === 'tier') {
        setActiveTier(active.data.current.tier);
    } else {
        setActiveItem(active.data.current?.mediaItem);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    setOverId(over?.id as string || null);
    
    if (active.data.current?.type === 'tier') return;

    const activeTierId = active.data.current?.sourceTier;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // We need state to find container. But using setState(prev) is better.
    // However, we need to know IF we should update.
    // DnD Kit documentation often recommends accessing state.
    // To make this stable, we depend on state.
    // Wait, if we depend on state, it re-renders anyway.
    // Let's rely on the fact that setState updater gives us latest state.
    // But we need to *calculate* newIndex based on state.
    
    setState((prev) => {
        const activeContainer = activeTierId || findContainer(activeId as string, prev.items);
        const overContainer = findContainer(overId as string, prev.items);

        if (!overContainer) return prev;

        if (!activeContainer) {
            // Dragging from Search
            // (We need to check addedItemIds, but that is memoized outside.
            // If we access it here, we depend on it.)
            // Let's assume we handle duplicates in the UI or check here if possible.
            // Just duplicating logic for now is safest.
            
            const activeItem = active.data.current?.mediaItem;
            if(!activeItem) return prev;
            
            // Check existence in previous state to be safe?
            // Or just allow it (UI hides added items).
            
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

            // Check if already exists to prevent duplicate keys if UI was out of sync
            // (Optional but good safety)
            const exists = Object.values(prev.items).flat().some(i => i.id === activeItem.id);
            if (exists) return prev;

            return {
                ...prev,
                items: {
                    ...prev.items,
                    [overContainer]: [
                        ...prev.items[overContainer].slice(0, newIndex),
                        { ...activeItem, id: activeId as string },
                        ...prev.items[overContainer].slice(newIndex, prev.items[overContainer].length),
                    ],
                }
            };
        }

        if (activeContainer === overContainer) {
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
        }

        // Moving between tiers
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
  }, [setState]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setActiveTier(null);
    setOverId(null); 

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
  }, [setState]);

  return {
    state,
    sensors,
    activeItem,
    activeTier,
    headerColors,
    addedItemIds,
    detailsItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleAddTier,
    handleUpdateTier,
    handleDeleteTier,
    handleRandomizeColors,
    handleClear,
    handleImport,
    handleExport,
    removeItemFromTier,
    handleLocate,
    handleShowDetails,
    handleCloseDetails
  };
}