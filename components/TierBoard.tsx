'use client';

import { 
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { TierRow } from '@/components/TierRow';
import { TierListState, MediaItem, TierDefinition } from '@/lib/types';
import { Plus } from 'lucide-react';

import { useBrandColors } from '@/lib/hooks/useBrandColors';
import { BrandLogo } from '@/components/BrandLogo';
import { ChangeEvent } from 'react';

interface TierBoardProps {
  state: TierListState;
  colors: string[];
  screenshotRef: React.RefObject<HTMLDivElement | null>;
  handleAddTier: () => void;
  handleUpdateTier: (id: string, updates: Partial<TierDefinition>) => void;
  handleDeleteTier: (id: string) => void;
  removeItemFromTier: (tierId: string, itemId: string) => void;
  handleShowDetails: (item: MediaItem) => void;
  isAnyDragging: boolean;
  tierListTitle: string;
  onUpdateTierListTitle: (newTitle: string) => void;
}

export function TierBoard({
  state,
  colors,
  screenshotRef,
  handleAddTier,
  handleUpdateTier,
  handleDeleteTier,
  removeItemFromTier,
  handleShowDetails,
  isAnyDragging,
  tierListTitle,
  onUpdateTierListTitle
}: TierBoardProps) {

  // Dynamic Logo Colors (Reusable Logic)
  const logoHexColors = useBrandColors(colors);
  
  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onUpdateTierListTitle(e.target.value);
  };

  return (
    <div className="space-y-4">
        <div ref={screenshotRef} className="space-y-2 p-1">
            <input
              type="text"
              value={tierListTitle}
              onChange={handleTitleChange}
              placeholder="Tier List Title"
              aria-label="Tier List Title"
              className="bg-transparent text-neutral-200 text-4xl font-black tracking-tighter italic text-center w-full focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-md mb-6"
            />
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
                className="screenshot-exclude w-full py-4 mb-6 border border-dashed border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:border-neutral-500 hover:bg-neutral-900 transition-all flex items-center justify-center gap-2 font-bold group"
            >
                 <div className="p-1 bg-neutral-800 rounded group-hover:bg-neutral-700 transition-colors">
                    <Plus size={16} />
                 </div>
                 <span>Add Tier</span>
            </button>

            {/* Branding Footer (Captured in Screenshot) */}
            <div className="pt-2 pb-0 text-center pointer-events-none select-none">
                <div className="flex items-center justify-center gap-3 opacity-90">
                    <BrandLogo 
                        colors={logoHexColors} 
                        variant="footer"
                    />
                    <span className="text-[10px] text-neutral-700 uppercase tracking-widest font-semibold border-l border-neutral-800 pl-3">
                        Tier List Maker
                    </span>
                </div>
            </div>
        </div>
    </div>
  );
}

