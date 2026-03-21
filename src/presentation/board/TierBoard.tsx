/**
 * @file TierBoard.tsx
 * @description The main visualization area of the application.
 * Renders the interactive list of tiers using the TierList component.
 * Responsible for the "Add Tier" action and integrating with the global TierListContext.
 * @module TierBoard
 */

'use client';

import { Plus } from 'lucide-react';

import { useTierListContext } from '@/presentation/board/context';

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
 * @returns The rendered TierBoard component.
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
        items={Object.fromEntries(
          Object.entries(state.tierLayout).map(([tierId, ids]) => [
            tierId,
            ids.map((id) => state.itemEntities[id]!).filter(Boolean),
          ]),
        )}
        isAnyDragging={isAnyDragging}
        onRemoveItem={removeItemFromTier}
        onUpdateTier={handleUpdateTier}
        onDeleteTier={handleDeleteTier}
        onInfo={handleShowDetails}
      />
      <button
        onClick={handleAddTier}
        className="group border-border text-secondary hover:border-muted hover:bg-surface hover:text-foreground flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-4 font-bold transition-all"
      >
        <div className="bg-surface-hover group-hover:bg-muted rounded-md p-1 transition-colors">
          <Plus size={16} />
        </div>
        <span>Add Tier</span>
      </button>
    </div>
  );
}
