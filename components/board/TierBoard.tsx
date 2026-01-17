/**
 * @file TierBoard.tsx
 * @description The main visualization area of the application.
 * Renders the interactive list of tiers using the shared TierList component.
 * Responsible for the "Add Tier" action and integrating with the global TierListContext.
 * @module TierBoard
 */

'use client';

import { TierList } from './TierList';
import { Plus } from 'lucide-react';
import { useTierListContext } from '@/components/TierListContext';

/**
 * Props for the TierBoard component.
 */
interface TierBoardProps {
  /** Whether any item or tier is currently being dragged. */
  isAnyDragging: boolean;
}

/**
 * The primary container for the interactive tier list.
 * Integrates with the TierListContext to manage state and actions.
 */
export function TierBoard(props: TierBoardProps) {
  const { isAnyDragging } = props;
  const {
    state,
    ui: { showDetails: handleShowDetails },
    actions: {
      addTier: handleAddTier,
      updateTier: handleUpdateTier,
      deleteTier: handleDeleteTier,
      removeItemFromTier,
    },
  } = useTierListContext();

  return (
    <div className="space-y-4">
      <TierList
        tiers={state.tierDefs}
        items={state.items}
        isAnyDragging={isAnyDragging}
        onRemoveItem={removeItemFromTier}
        onUpdateTier={handleUpdateTier}
        onDeleteTier={handleDeleteTier}
        onInfo={handleShowDetails}
      />
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
