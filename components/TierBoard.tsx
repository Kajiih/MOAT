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
            <button 
                onClick={handleAddTier}
                className="w-full py-4 border border-dashed border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:border-neutral-500 hover:bg-neutral-900 transition-all flex items-center justify-center gap-2 font-bold group"
            >
                 <div className="p-1 bg-neutral-800 rounded group-hover:bg-neutral-700 transition-colors">
                    <Plus size={16} />
                 </div>
                 <span>Add Tier</span>
            </button>

            {/* Branding Footer (Captured in Screenshot) */}
            <div className="pt-8 pb-4 text-center pointer-events-none select-none">
                <div className="flex items-center justify-center gap-3 opacity-90">
                    <span className="text-sm font-black tracking-[0.3em] flex gap-[2px]">
                        <span className="text-red-500">M</span>
                        <span className="text-orange-500">O</span>
                        <span className="text-emerald-500">A</span>
                        <span className="text-violet-500">T</span>
                    </span>
                    <span className="text-[10px] text-neutral-700 uppercase tracking-widest font-semibold border-l border-neutral-800 pl-3">
                        Tier List Maker
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
}

