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
import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { MediaItem, TierDefinition, TierListState } from '@/lib/types';

export function useTierListDnD(
  state: TierListState,
  setState: Dispatch<SetStateAction<TierListState>>
) {
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [activeTier, setActiveTier] = useState<TierDefinition | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

    setState((prev) => {
        const activeContainer = activeTierId || findContainer(activeId as string, prev.items);
        const overContainer = findContainer(overId as string, prev.items);

        if (!overContainer) return prev;

        if (!activeContainer) {
            // Dragging from Search
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

            // Check if already exists to prevent duplicate keys if UI was out of sync
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
        const activeId = active.id;
        const overId = over?.id;
        
        // 1. Handle same-container sorting (moved from handleDragOver)
        if (activeId && overId && activeId !== overId) {
            const activeContainer = findContainer(activeId as string, prev.items);
            const overContainer = findContainer(overId as string, prev.items);

            if (activeContainer && overContainer && activeContainer === overContainer) {
                const activeItems = prev.items[activeContainer];
                const activeIndex = activeItems.findIndex((i) => i.id === activeId);
                const overIndex = activeItems.findIndex((i) => i.id === overId);

                if (activeIndex !== overIndex) {
                    return {
                        ...prev,
                        items: {
                            ...prev.items,
                            [activeContainer]: arrayMove(activeItems, activeIndex, overIndex)
                        }
                    };
                }
            }
        }

        // 2. Fix search IDs (Legacy)
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
    sensors,
    activeItem,
    activeTier,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
}
