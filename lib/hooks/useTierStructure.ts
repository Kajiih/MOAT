/**
 * @file useTierStructure.ts
 * @description Hook responsible for the structural manipulation of the tier board.
 * Contains logic for Adding, Deleting, Updating, and Clearing tiers.
 * Also handles the "Randomize Colors" feature.
 * @module useTierStructure
 */

import { useCallback, Dispatch, SetStateAction } from 'react';
import { TierListState, TierDefinition } from '@/lib/types';
import { TIER_COLORS } from '@/lib/colors';
import { useToast } from '@/components/ToastProvider';
import { INITIAL_STATE } from '@/lib/initial-state';

/**
 * Hook to manage the structure of the tier list board (rows/tiers) and global board actions.
 */
export function useTierStructure(
  setState: Dispatch<SetStateAction<TierListState>>,
  pushHistory: () => void
) {
  const { showToast } = useToast();

  const handleAddTier = useCallback(() => {
    pushHistory();
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
            ...prev,
            tierDefs: [...prev.tierDefs, newTier],
            items: { ...prev.items, [newId]: [] }
        };
    });
  }, [setState, pushHistory]);

  const handleRandomizeColors = useCallback(() => {
    pushHistory();
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
  }, [setState, showToast, pushHistory]);

  const handleUpdateTier = useCallback((id: string, updates: Partial<TierDefinition>) => {
    // Only push history for significant updates (e.g. not every keystroke if this is debounced elsewhere)
    // Assuming this is called on blur or after debounce for text inputs
    pushHistory();
    setState(prev => ({
        ...prev,
        tierDefs: prev.tierDefs.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  }, [setState, pushHistory]);

  const handleDeleteTier = useCallback((id: string) => {
    pushHistory();
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
            ...prev,
            tierDefs: prev.tierDefs.filter(t => t.id !== id),
            items: newItems
        };
    });
  }, [setState, pushHistory]);

  const handleClear = useCallback(() => {
    if(confirm("Clear everything?")) {
        pushHistory();
        setState(INITIAL_STATE);
        showToast("Board cleared", "info");
    }
  }, [setState, showToast, pushHistory]);

  return {
    handleAddTier,
    handleUpdateTier,
    handleDeleteTier,
    handleRandomizeColors,
    handleClear,
    INITIAL_STATE // Exported for useTierList initialization if needed, though useTierList has it too.
  };
}
