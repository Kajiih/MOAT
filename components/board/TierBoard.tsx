/**
 * @file TierBoard.tsx
 * @description The main visualization area of the application.
 * Renders the interactive list of tiers using the shared TierList component.
 * Responsible for the "Add Tier" action and integrating with the global TierListContext.
 * @module TierBoard
 */

'use client';

import { Plus } from 'lucide-react';

import { useTierListContext } from '@/components/TierListContext';

import { TierList } from './TierList';

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
 * @param props - The props for the component.
 * @param props.isAnyDragging - Whether any item or tier is currently being dragged.
 */
export function TierBoard({ isAnyDragging }: TierBoardProps) {
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
        className="group flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-700 py-4 font-bold text-neutral-400 transition-all hover:border-neutral-500 hover:bg-neutral-900 hover:text-white"
      >
        <div className="rounded bg-neutral-800 p-1 transition-colors group-hover:bg-neutral-700">
          <Plus size={16} />
        </div>
        <span>Add Tier</span>
      </button>
    </div>
  );
}
