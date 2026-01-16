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
import { MediaCard } from '@/components/media/MediaCard';
import { TierRow } from '@/components/board/TierRow';
import { Header } from '@/components/ui/Header';
import { SearchPanel } from '@/components/search/SearchPanel';
import { DetailsModal } from '@/components/media/DetailsModal';
import { TierBoard } from '@/components/board/TierBoard';
import { Dices } from 'lucide-react';
import { useScreenshot, useDynamicFavicon } from '@/lib/hooks';
import { useTierListContext } from '@/components/TierListContext';
import { useBackgroundEnrichment } from '@/lib/hooks/useBackgroundEnrichment';
import { useToast } from '@/components/ui/ToastProvider';
import { getColorTheme } from '@/lib/colors';
import { useEffect, useState } from 'react';
import { InteractionContext, HoveredItemInfo } from '@/components/ui/InteractionContext';

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
 * - Integrates with the `useTierListContext` for state management.
 * - Handles global UI elements like the "Randomize Colors" button and Details Modal.
 */
export default function TierListApp() {
  const {
    state,
    isHydrated,
    actions: { 
        randomizeColors, 
        removeItemFromTier, 
        updateMediaItem 
    },
    dnd: { 
        sensors, 
        activeItem, 
        activeTier, 
        handleDragStart, 
        handleDragOver, 
        handleDragEnd 
    },
    ui: { 
        headerColors, 
        detailsItem, 
        allBoardItems,
        showDetails,
        closeDetails
    },
    history: { 
        undo, 
        redo, 
        canUndo, 
        canRedo 
    }
  } = useTierListContext();

  const { toastCount } = useToast();
  const { ref: screenshotRef, takeScreenshot, isCapturing } = useScreenshot('moat-tierlist.png');
  
  // UI Interaction State (Hover)
  const [hoveredItem, setHoveredItem] = useState<HoveredItemInfo | null>(null);

  // Background Bundler: Automatically syncs deep metadata for items on the board
  useBackgroundEnrichment(allBoardItems, updateMediaItem);

  // Dynamically update favicon based on current board colors
  useDynamicFavicon(headerColors);

  // Update document title based on tierListTitle
  useEffect(() => {
    document.title = `${state.title} - MOAT`;
  }, [state.title]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Undo/Redo
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                if (canRedo) redo();
            } else {
                if (canUndo) undo();
            }
            return;
        }

        // Hover Shortcuts
        if (hoveredItem) {
            // 'x' to remove item (only if in a tier)
            if (e.key === 'x' && hoveredItem.tierId) {
                e.preventDefault(); // Prevent accidental typing if input is focused (though unlikely with hover)
                removeItemFromTier(hoveredItem.tierId, hoveredItem.item.id);
                setHoveredItem(null); // Clear hover state since item is gone
            }
            // 'i' to show details
            if (e.key === 'i') {
                e.preventDefault();
                showDetails(hoveredItem.item);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, hoveredItem, removeItemFromTier, showDetails]);

  if (!isHydrated) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen text-neutral-200 p-8 font-sans relative">
      <InteractionContext.Provider value={{ setHoveredItem }}>
        
        <div className="max-w-[1600px] mx-auto">
            <Header 
                onScreenshot={takeScreenshot}
                isCapturing={isCapturing}
            />

            <DndContext 
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart} 
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-8 items-start">
                    <div className="lg:-mt-20">
                    <TierBoard 
                        screenshotRef={screenshotRef}
                        isAnyDragging={!!activeItem || !!activeTier}
                    />
                    </div>

                    <SearchPanel />
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
            onClose={closeDetails}
            onUpdateItem={updateMediaItem}
        />

        {/* Floating Randomize Colors Button */}
        <button 
            onClick={randomizeColors} 
            className={`fixed right-8 p-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group z-50 screenshot-exclude ${
            toastCount > 0 ? 'bottom-18' : 'bottom-8'
            }`}
            title="Randomize Colors"
        >
            <Dices size={24} className="group-hover:rotate-12 transition-transform" />
        </button>
      </InteractionContext.Provider>
    </div>
  );
}
