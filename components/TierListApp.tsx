'use client';

import { 
  DndContext, 
  DragOverlay, 
  rectIntersection,
} from '@dnd-kit/core';
import { MediaCard } from '@/components/MediaCard';
import { TierRow } from '@/components/TierRow';
import { Header } from '@/components/Header';
import { SearchPanel } from '@/components/SearchPanel';
import { DetailsModal } from '@/components/DetailsModal';
import { TierBoard } from '@/components/TierBoard';
import { Dices } from 'lucide-react';
import { useTierList, useScreenshot, useDynamicFavicon } from '@/lib/hooks';
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
  const { ref: screenshotRef, takeScreenshot, isCapturing } = useScreenshot('moat-tierlist.png');
  
  // Dynamically update favicon based on current board colors
  useDynamicFavicon(headerColors);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans relative">
      <div className="max-w-[1600px] mx-auto">
        <Header 
            onImport={handleImport} 
            onExport={handleExport}
            onScreenshot={takeScreenshot}
            isCapturing={isCapturing}
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
                <TierBoard 
                    state={state}
                    colors={headerColors}
                    screenshotRef={screenshotRef}
                    handleAddTier={handleAddTier}
                    handleUpdateTier={handleUpdateTier}
                    handleDeleteTier={handleDeleteTier}
                    removeItemFromTier={removeItemFromTier}
                    handleShowDetails={handleShowDetails}
                    isAnyDragging={!!activeItem || !!activeTier}
                />

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
