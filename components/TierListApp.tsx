/**
 * @file TierListApp.tsx
 * @description The main container component for the application.
 * Composes the Drag-and-Drop context, Header, Tier Board, and Search Panel.
 * Acts as the entry point for the interactive tier list experience.
 * @module TierListApp
 */

'use client';

import { DndContext, DragOverlay, rectIntersection } from '@dnd-kit/core';
import { Camera, Dices, Loader2,X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ExportBoard } from '@/components/board/ExportBoard';
import { TierBoard } from '@/components/board/TierBoard';
import { TierRow } from '@/components/board/TierRow';
import { DetailsModal } from '@/components/media/DetailsModal';
import { MediaCard } from '@/components/media/MediaCard';
import { SearchPanel } from '@/components/search/SearchPanel';
import { useTierListContext } from '@/components/TierListContext';
import { Footer } from '@/components/ui/Footer';
import { Header } from '@/components/ui/Header';
import { HoveredItemInfo,InteractionContext } from '@/components/ui/InteractionContext';
import { useToast } from '@/components/ui/ToastProvider';
import { getColorTheme } from '@/lib/colors';
import { useDynamicFavicon,useScreenshot } from '@/lib/hooks';
import { useBackgroundEnrichment } from '@/lib/hooks/useBackgroundEnrichment';
import { useBrandColors } from '@/lib/hooks/useBrandColors';
import { MediaItem } from '@/lib/types';

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
          return (
            <span key={i} className={theme.text}>
              {letter}
            </span>
          );
        })}
      </h1>
      <div className="text-neutral-500 text-sm">Loading application...</div>
    </div>
  );
};

interface UseAppShortcutsProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hoveredItem: HoveredItemInfo | null;
  setHoveredItem: (item: HoveredItemInfo | null) => void;
  removeItemFromTier: (tierId: string, itemId: string) => void;
  showDetails: (item: MediaItem) => void;
  closeDetails: () => void;
  setShowExportPreview: (show: boolean | ((prev: boolean) => boolean)) => void;
}

function handleUndoRedo(e: KeyboardEvent, props: UseAppShortcutsProps) {
  const { undo, redo, canUndo, canRedo } = props;
  if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      if (canRedo) redo();
    } else {
      if (canUndo) undo();
    }
    return true;
  }
  return false;
}

function handleHoverShortcuts(e: KeyboardEvent, props: UseAppShortcutsProps) {
  const { hoveredItem, removeItemFromTier, setHoveredItem, showDetails } = props;
  if (hoveredItem) {
    // 'x' to remove item (only if in a tier)
    if (e.key === 'x' && hoveredItem.tierId) {
      e.preventDefault();
      removeItemFromTier(hoveredItem.tierId, hoveredItem.item.id);
      setHoveredItem(null);
    }
    // 'i' to show details
    if (e.key === 'i') {
      e.preventDefault();
      showDetails(hoveredItem.item);
    }
  }
}

function handleGlobalShortcuts(e: KeyboardEvent, props: UseAppShortcutsProps) {
  const { setShowExportPreview, closeDetails } = props;
  // Toggle Export Preview (Shift + P)
  if (e.shiftKey && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    setShowExportPreview((prev) => !prev);
  }

  // Close on ESC
  if (e.key === 'Escape') {
    setShowExportPreview(false);
    closeDetails();
  }
}

/**
 * Custom hook to handle global keyboard shortcuts.
 */
function useAppShortcuts(props: UseAppShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (handleUndoRedo(e, props)) return;
      handleHoverShortcuts(e, props);
      handleGlobalShortcuts(e, props);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [props]);
}

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
    actions: { randomizeColors, removeItemFromTier, updateMediaItem },
    dnd: { sensors, activeItem, activeTier, handleDragStart, handleDragOver, handleDragEnd },
    ui: { headerColors, detailsItem, allBoardItems, showDetails, closeDetails },
    history: { undo, redo, canUndo, canRedo },
  } = useTierListContext();

  const { toastCount } = useToast();
  const { takeScreenshot: capture, isCapturing } = useScreenshot('moat-tierlist.png');
  const handleScreenshot = () => capture(state, headerColors);

  // UI Interaction State (Hover)
  const [hoveredItem, setHoveredItem] = useState<HoveredItemInfo | null>(null);
  const [showExportPreview, setShowExportPreview] = useState(false);

  // Background Bundler: Automatically syncs deep metadata for items on the board
  useBackgroundEnrichment(allBoardItems, updateMediaItem);

  // Dynamically update favicon based on current board colors
  useDynamicFavicon(headerColors);

  // Brand colors for footer
  const footerBrandColors = useBrandColors(headerColors);

  const fabPosition = toastCount > 0 ? 'bottom-18' : 'bottom-8';

  // Update document title based on tierListTitle
  useEffect(() => {
    document.title = `${state.title} - MOAT`;
  }, [state.title]);

  // Global Keyboard Shortcuts
  useAppShortcuts({
    undo,
    redo,
    canUndo,
    canRedo,
    hoveredItem,
    setHoveredItem,
    removeItemFromTier,
    showDetails,
    closeDetails,
    setShowExportPreview,
  });

  if (!isHydrated) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen text-neutral-200 font-sans flex flex-col relative">
      <InteractionContext.Provider value={{ setHoveredItem }}>
        <main className="flex-1 p-8 pb-0">
          <div className="max-w-[1600px] mx-auto">
            <Header onScreenshot={handleScreenshot} isCapturing={isCapturing} />

            <DndContext
              sensors={sensors}
              collisionDetection={rectIntersection}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-8 items-start">
                <div>
                  <TierBoard isAnyDragging={!!activeItem || !!activeTier} />
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
        </main>

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
          className={`fixed right-8 p-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group z-50 screenshot-exclude ${fabPosition}`}
          title="Randomize Colors"
        >
          <Dices size={24} className="group-hover:rotate-12 transition-transform" />
        </button>

        {/* Export Preview Overlay */}
        {showExportPreview && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm overflow-auto p-20 flex flex-col items-center">
            <div className="relative">
              {/* Preview Header */}
              <div className="absolute -top-12 left-0 right-0 flex justify-between items-center px-4">
                <span className="text-neutral-500 font-mono text-xs uppercase tracking-widest">
                  Export Preview (Shift+P to close)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleScreenshot}
                    disabled={isCapturing}
                    className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isCapturing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Camera size={16} />
                    )}
                    {isCapturing ? 'Saving...' : 'Save PNG'}
                  </button>
                  <button
                    onClick={() => setShowExportPreview(false)}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* The Actual Export Surface */}
              <div className="shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-neutral-800">
                <ExportBoard state={state} brandColors={headerColors} />
              </div>

              <div className="mt-8 text-center text-neutral-600 text-sm">
                This is a live preview of the export board. Interaction is disabled here.
              </div>
            </div>
          </div>
        )}

        {/* Page Footer */}
        <Footer colors={footerBrandColors} className="pt-4 pb-6 opacity-60" />
      </InteractionContext.Provider>
    </div>
  );
}
