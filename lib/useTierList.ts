import { useState, useMemo, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { MediaItem, TierListState, TierDefinition } from '@/lib/types';
import { TIER_COLORS } from '@/lib/colors';
import { usePersistentState } from '@/lib/hooks';
import { useToast } from '@/components/ToastProvider';
import { useTierListDnD } from '@/lib/hooks/useTierListDnD';

const INITIAL_STATE: TierListState = {
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

export function useTierList() {
  const [state, setState] = usePersistentState<TierListState>(LOCAL_STORAGE_KEY, INITIAL_STATE);
  
  // State for Details Modal
  const [detailsItem, setDetailsItem] = useState<MediaItem | null>(null);
  
  const { showToast } = useToast();

  // Use the extracted DnD hook
  const {
    sensors,
    activeItem,
    activeTier,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  } = useTierListDnD(state, setState);

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
    // Export as a nested structure for cleaner JSON and portability
    const exportData = {
      version: 1,
      createdAt: new Date().toISOString(),
      tiers: state.tierDefs.map(tier => ({
        label: tier.label,
        color: tier.color,
        items: state.items[tier.id] || []
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
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
            
            // Handle new nested format
            if (parsed.tiers && Array.isArray(parsed.tiers)) {
                const newTierDefs: TierDefinition[] = [];
                const newItems: Record<string, MediaItem[]> = {};

                parsed.tiers.forEach((tier: { label: string, color: string, items: MediaItem[] }) => {
                    const id = crypto.randomUUID();
                    newTierDefs.push({
                        id,
                        label: tier.label,
                        color: tier.color
                    });
                    newItems[id] = tier.items || [];
                });

                setState({
                    tierDefs: newTierDefs,
                    items: newItems
                });
                showToast("Tier list imported successfully!", "success");
                return;
            }

            // Fallback: Handle legacy format (raw state dump)
            if (parsed && 'tierDefs' in parsed) {
                setState(parsed);
                showToast("Legacy tier list imported successfully!", "success");
            } else {
                showToast("Invalid JSON file: missing tier definitions", "error");
            }
        } catch (e) { 
            console.error(e);
            showToast("Invalid JSON file", "error"); 
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    e.target.value = '';
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