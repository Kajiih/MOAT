/**
 * @file TierBoard.tsx
 * @description The main visualization area of the application.
 * Renders the list of tiers (using @dnd-kit SortableContext) and manages the board title input.
 * Responsible for assembling the 'Screenshot' view of the tier list.
 * @module TierBoard
 */

'use client';

import { 
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { TierRow } from './TierRow';
import { Plus } from 'lucide-react';
import { useTierListContext } from '@/components/TierListContext';

interface TierBoardProps {
  isAnyDragging: boolean;
}

export function TierBoard({
  isAnyDragging,
}: TierBoardProps) {

  const {
      state,
      ui: { showDetails: handleShowDetails },
      actions: { 
          addTier: handleAddTier, 
          updateTier: handleUpdateTier, 
          deleteTier: handleDeleteTier, 
          removeItemFromTier
      }
  } = useTierListContext();

  return (
    <div className="space-y-4">
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
                    isAnyDragging={isAnyDragging}
                    onInfo={handleShowDetails}
                />
            ))}
        </SortableContext>
        <button 
            onClick={handleAddTier}
            className="w-full py-4 border border-dashed border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:border-neutral-500 hover:bg-neutral-900 transition-all flex items-center justify-center gap-2 font-bold group"
        >
             <div className="p-1 bg-neutral-800 rounded group-hover:bg-neutral-700 transition-colors">
                <Plus size={16} />
             </div>
             <span>Add Tier</span>
        </button>
    </div>
  );
}

