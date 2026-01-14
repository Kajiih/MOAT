/**
 * @file TierListApp.tsx
 * @description The main container component for the application.
 * Composes the Drag-and-Drop context, Header, Tier Board, and Search Panel.
 * Acts as the entry point for the interactive tier list experience.
 * @module TierListApp
 */

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
import { BoardDetailBundler } from '@/components/BoardDetailBundler';
import { Dices } from 'lucide-react';
import { useTierList, useScreenshot, useDynamicFavicon } from '@/lib/hooks';
import { useToast } from './ToastProvider';
import { getColorTheme } from '@/lib/colors';
import { useEffect } from 'react';

/**
 * Simple loading screen displayed while persisted state is being hydrated.
 * Shows a pulsing animation of the "MOAT" logo.
 */
const LoadingState = () => {
    const letters = ['M', 'O', 'A', 'T'];
    const colors = ['red', 'orange', 'amber', 'green']; // Preview colors
    
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans flex flex-col items-center justify-center gap-4">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic animate-pulse select-none flex">
              {letters.map((letter, i) => {
                  const theme = getColorTheme(colors[i]);
                  return <span key={i} className={theme.text}>{letter}</span>;
              })}
          </h1>
          <div className="text-neutral-500 text-sm">Loading application...</div>
        </div>
    );
};

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
    allBoardItems,
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
    updateMediaItem,
    handleLocate,
    handleShowDetails,
    handleCloseDetails,
    isHydrated,
    title: tierListTitle, // Alias state.title to tierListTitle
    handleUpdateTitle
  } = useTierList();

  const { toastCount } = useToast();
  const { ref: screenshotRef, takeScreenshot, isCapturing } = useScreenshot('moat-tierlist.png');
  
  // Dynamically update favicon based on current board colors
  useDynamicFavicon(headerColors);

  // Update document title based on tierListTitle
  useEffect(() => {
    document.title = `${tierListTitle} - MOAT`;
  }, [tierListTitle]);

  if (!isHydrated) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen text-neutral-200 p-8 font-sans relative">
      {/* Background Bundler: Automatically syncs deep metadata for items on the board */}
      <BoardDetailBundler 
        items={allBoardItems} 
        onUpdateItem={updateMediaItem} 
      />

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
                <div className="lg:-mt-20">
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
                      tierListTitle={tierListTitle}
                      onUpdateTierListTitle={handleUpdateTitle}
                  />
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
        onUpdateItem={updateMediaItem}
      />

      {/* Floating Randomize Colors Button */}
      <button 
        onClick={handleRandomizeColors} 
        className={`fixed right-8 p-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group z-50 screenshot-exclude ${
          toastCount > 0 ? 'bottom-18' : 'bottom-8'
        }`}
        title="Randomize Colors"
      >
          <Dices size={24} className="group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );
}
