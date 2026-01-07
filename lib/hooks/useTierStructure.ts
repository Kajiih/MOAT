import { useCallback, Dispatch, SetStateAction } from 'react';
import { TierListState, TierDefinition } from '@/lib/types';
import { TIER_COLORS } from '@/lib/colors';
import { useToast } from '@/components/ToastProvider';

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

/**
 * Hook to manage the structure of the tier list board (rows/tiers) and global board actions.
 */
export function useTierStructure(
  setState: Dispatch<SetStateAction<TierListState>>
) {
  const { showToast } = useToast();

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

  const handleClear = useCallback(() => {
    if(confirm("Clear everything?")) {
        setState(INITIAL_STATE);
        showToast("Board cleared", "info");
    }
  }, [setState, showToast]);

  return {
    handleAddTier,
    handleUpdateTier,
    handleDeleteTier,
    handleRandomizeColors,
    handleClear,
    INITIAL_STATE // Exported for useTierList initialization if needed, though useTierList has it too.
  };
}
