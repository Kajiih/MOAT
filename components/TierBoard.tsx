'use client';

import { 
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { TierRow } from '@/components/TierRow';
import { TierListState, MediaItem, TierDefinition } from '@/lib/types';
import { Plus } from 'lucide-react';

interface TierBoardProps {
  state: TierListState;
  screenshotRef: React.RefObject<HTMLDivElement | null>;
  handleAddTier: () => void;
  handleUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
  handleDeleteTier: (id: string) => void;
  removeItemFromTier: (tierId: string, itemId: string) => void;
  handleShowDetails: (item: MediaItem) => void;
  isAnyDragging: boolean;
}

export function TierBoard({
  state,
  screenshotRef,
  handleAddTier,
  handleUpdateTier,
  handleDeleteTier,
  removeItemFromTier,
  handleShowDetails,
  isAnyDragging
}: TierBoardProps) {

  const isBoardEmpty = Object.values(state.items).every(items => items.length === 0);

  return (
    <div className="space-y-4">
        <div ref={screenshotRef} className="space-y-2 p-1">
            <SortableContext 
                items={state.tierDefs.map(t => t.id)} 
                strategy={verticalListSortingStrategy}
            >
                {state.tierDefs.map((tier, index) => (
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
                        isBoardEmpty={isBoardEmpty}
                        isMiddleTier={index === Math.floor((state.tierDefs.length - 1) / 2)}
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
  );
}