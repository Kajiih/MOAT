/**
 * @file useTierList.ts
 * @description The central hook for managing the tier list state. 
 * Orchestrates drag-and-drop, persistence, board structure modifications (add/remove tiers), and import/export functionality.
 * @module useTierList
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { MediaItem, TierListState } from '@/lib/types';
import { usePersistentState, useTierStructure } from '@/lib/hooks';
import { useToast } from '@/components/ToastProvider';
import { useMediaRegistry } from '@/components/MediaRegistryProvider';
import { useTierListDnD } from '@/lib/hooks/useTierListDnD';
import { generateExportData, downloadJson, parseImportData } from '@/lib/utils/io';

const INITIAL_STATE: TierListState = {
  title: 'My Tier List',
  tierDefs: [
    { id: 'tier-1', label: 'S', color: 'red' },
    { id: 'tier-2', label: 'A', color: 'orange' },
    { id: 'tier-3', label: 'B', color: 'amber' },
    { id: 'tier-4', label: 'C', color: 'green' },
    { id: 'tier-5', label: 'D', color: 'blue' },
    { id: 'tier-6', label: 'Unranked', color: 'neutral' },
  ],
  items: { 
    'tier-1': [], 
    'tier-2': [], 
    'tier-3': [], 
    'tier-4': [], 
    'tier-5': [], 
    'tier-6': [] 
  }
};

const LOCAL_STORAGE_KEY = 'moat-tierlist';

/**
 * Primary hook for managing the state and interactions of the Tier List application.
 * 
 * Responsibilities:
 * - Manages the core Tier List state (tiers, items) with local storage persistence.
 * - Integrates with Drag and Drop logic (useTierListDnD).
 * - Integrates with Board Structure logic (useTierStructure).
 * - Handles data import/export (JSON).
 * - Manages the "Details Modal" state.
 * - Handles locating items on the board.
 * - Syncs item updates to the global Media Registry.
 */
export function useTierList() {
  const [state, setState, isHydrated] = usePersistentState<TierListState>(LOCAL_STORAGE_KEY, INITIAL_STATE);
  
  // State for Details Modal
  const [detailsItem, setDetailsItem] = useState<MediaItem | null>(null);
  
  const { showToast } = useToast();

  // 1. Drag & Drop Logic
  const {
    sensors,
    activeItem,
    activeTier,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  } = useTierListDnD(state, setState);

  // 2. Structure & Board Actions Logic
  const {
    handleAddTier,
    handleUpdateTier,
    handleDeleteTier,
    handleRandomizeColors,
    handleClear
  } = useTierStructure(setState);

  const allBoardItems = useMemo(() => {
    return Object.values(state.items).flat();
  }, [state.items]);

  const addedItemIds = useMemo(() => {
    const ids = new Set<string>();
    allBoardItems.forEach(item => {
        const cleanId = item.id.replace(/^search-/, '');
        ids.add(cleanId);
    });
    return ids;
  }, [allBoardItems]);

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
    try {
      const exportData = generateExportData(state);
      const filename = `moat-${new Date().toISOString().slice(0,10)}.json`;
      downloadJson(exportData, filename);
      showToast("Tier list exported successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to export tier list.", "error");
    }
  }, [state, showToast]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const jsonString = ev.target?.result as string;
            const newState = parseImportData(jsonString, INITIAL_STATE.title);
            
            setState(newState);
            showToast("Tier list imported successfully!", "success");
        } catch (e) { 
            console.error(e);
            showToast("Invalid JSON file", "error"); 
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  }, [setState, showToast]);

  // --- Details Modal Handlers ---
  const handleShowDetails = useCallback((item: MediaItem) => {
    setDetailsItem(item);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsItem(null);
  }, []);

  const removeItemFromTier = useCallback((tierId: string, itemId: string) => {
    setState(prev => ({
        ...prev,
        items: {
            ...prev.items,
            [tierId]: prev.items[tierId].filter(a => a.id !== itemId && a.id !== `search-${itemId}`)
        }
    }));
  }, [setState]);

  const { registerItem } = useMediaRegistry();
  
  // Track items that need to be registered (to avoid calling registerItem inside setState)
  const itemsToRegister = useRef<MediaItem[]>([]);

  // Sync items to registry after state updates
  useEffect(() => {
    if (itemsToRegister.current.length > 0) {
      itemsToRegister.current.forEach(item => registerItem(item));
      itemsToRegister.current = [];
    }
  });

  const updateMediaItem = useCallback((itemId: string, updates: Partial<MediaItem>) => {
    setState(prev => {
        const newItems = { ...prev.items };
        let modified = false;

        const tierIds = Object.keys(newItems);
        for (const tierId of tierIds) {
            const list = newItems[tierId];
            const index = list.findIndex(a => a.id === itemId);
            if (index !== -1) {
                const currentItem = list[index];
                
                // PERFORMANCE: Skip update if details are effectively identical
                if (updates.details && currentItem.details) {
                    const currentDetailsStr = JSON.stringify(currentItem.details);
                    const newDetailsStr = JSON.stringify(updates.details);
                    if (currentDetailsStr === newDetailsStr && Object.keys(updates).length === 1) {
                        return prev;
                    }
                }

                const updatedItem = { ...currentItem, ...updates } as MediaItem;
                
                newItems[tierId] = [
                    ...list.slice(0, index),
                    updatedItem,
                    ...list.slice(index + 1)
                ];

                // Queue for registry update (will happen in useEffect)
                itemsToRegister.current.push(updatedItem);
                modified = true;
                break;
            }
        }
        return modified ? { ...prev, items: newItems } : prev;
    });
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

  const handleUpdateTitle = useCallback((newTitle: string) => {
    setState(prev => ({
      ...prev,
      title: newTitle,
    }));
  }, [setState]);

  return {
    state,
    allBoardItems,
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
    updateMediaItem,
    handleLocate,
    handleShowDetails,
    handleCloseDetails,
    isHydrated,
    handleUpdateTitle,
    title: state.title,
  };
}
