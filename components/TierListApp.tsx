'use client';

import { 
  DndContext, 
  DragOverlay, 
  rectIntersection,
} from '@dnd-kit/core';
import { 
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { MediaCard } from '@/components/MediaCard';
import { TierRow } from '@/components/TierRow';
import { Header } from '@/components/Header';
import { SearchPanel } from '@/components/SearchPanel';
import { DetailsModal } from '@/components/DetailsModal';
import { Plus, Dices } from 'lucide-react';
import { useTierList } from '@/lib/useTierList';
import { useToast } from './ToastProvider';

/**
 * The main application component for the Tier List app.
 * 
 * Responsibilities:
 * - Orchestrates the drag-and-drop context (`DndContext`).
 * - Manages the main layout (header, tier list, search panel).
 * - Integrates with the `useTierList` hook for state management.
 * - Handles global UI elements like the "Randomize Colors" button and Details Modal.
 */
export default function TierListApp() {
  const {
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
  } = useTierList();

  const { toastCount } = useToast();

  const isBoardEmpty = Object.values(state.items).every(items => items.length === 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans relative">
      <div className="max-w-[1600px] mx-auto">
        <Header 
            onImport={handleImport} 
            onExport={handleExport} 
            onClear={handleClear} 
            colors={headerColors}
        />

        <DndContext 
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart} 
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
                <div className="space-y-4">
                    <div className="space-y-2">
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
                                    isAnyDragging={!!activeItem || !!activeTier}
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

                <SearchPanel 
                    addedItemIds={addedItemIds}
                    onLocate={handleLocate}
                    onInfo={handleShowDetails}
                />
            </div>

            <DragOverlay>
                {activeTier ? (
                    <div className="w-full opacity-80 pointer-events-none">
                         <TierRow 
                            tier={activeTier} 
                            items={state.items[activeTier.id] || []}
                            onRemoveItem={() => {}}
                            onUpdateTier={() => {}}
                            onDeleteTier={() => {}}
                            canDelete={false}
                            onInfo={() => {}}
                        />
                    </div>
                ) : activeItem ? (
                    <MediaCard item={activeItem} />
                ) : null}
            </DragOverlay>

        </DndContext>
      </div>

      <DetailsModal 
        key={detailsItem?.id || 'modal'}
        item={detailsItem} 
        isOpen={!!detailsItem} 
        onClose={handleCloseDetails} 
      />

      {/* Floating Randomize Colors Button */}
      <button 
        onClick={handleRandomizeColors} 
        className={`fixed right-8 p-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group z-50 ${
          toastCount > 0 ? 'bottom-18' : 'bottom-8'
        }`}
        title="Randomize Colors"
      >
          <Dices size={24} className="group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );
}
