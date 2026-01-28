/**
 * @file TierListApp.tsx
 * @description The main container component for the application.
 * Composes the Drag-and-Drop context, Header, Tier Board, and Search Panel.
 * Acts as the entry point for the interactive tier list experience.
 * @module TierListApp
 */

'use client';

import { DndContext, DragOverlay, rectIntersection } from '@dnd-kit/core';
import { Leva } from 'leva';
import { Camera, Dices, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ExportBoard } from '@/components/board/ExportBoard';
import { TierBoard } from '@/components/board/TierBoard';
import { TierRow } from '@/components/board/TierRow';
import { DetailsModal } from '@/components/media/DetailsModal';
import { MediaCard } from '@/components/media/MediaCard';
import { useTierListContext } from '@/components/providers/TierListContext';
import { SearchPanel } from '@/components/search/SearchPanel';
import { DebugPanel } from '@/components/ui/DebugPanel';
import { Footer } from '@/components/ui/Footer';
import { Header } from '@/components/ui/Header';
import { HoveredItemInfo, InteractionContext } from '@/components/ui/InteractionContext';
import { useToast } from '@/components/ui/ToastProvider';
import { getColorTheme } from '@/lib/colors';
import { useDynamicFavicon, useScreenshot } from '@/lib/hooks';
import { useBackgroundEnrichment } from '@/lib/hooks/useBackgroundEnrichment';
import { useBrandColors } from '@/lib/hooks/useBrandColors';
import { MediaItem } from '@/lib/types';

/**
 * Simple loading screen displayed while persisted state is being hydrated.
 * Shows a pulsing animation of the "MOAT" logo.
 * @returns A loading state component.
 */
const LoadingState = () => {
  const letters = ['M', 'O', 'A', 'T'];
  const colors = ['red', 'orange', 'amber', 'green']; // Preview colors

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 p-8 font-sans text-neutral-200">
      <h1 className="flex animate-pulse text-4xl font-black tracking-tighter uppercase italic select-none">
        {letters.map((letter, i) => {
          const theme = getColorTheme(colors[i]);
          return (
            <span key={i} className={theme.text}>
              {letter}
            </span>
          );
        })}
      </h1>
      <div className="text-sm text-neutral-500">Loading application...</div>
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
  setShowShortcuts: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowExportPreview: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowDebugPanel: (show: boolean | ((prev: boolean) => boolean)) => void;
}

function handleUndoRedo(
  event: KeyboardEvent,
  { undo, redo, canUndo, canRedo }: UseAppShortcutsProps,
) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      if (canRedo) redo();
    } else {
      if (canUndo) undo();
    }
    return true;
  }
  return false;
}

function handleHoverShortcuts(
  event: KeyboardEvent,
  { hoveredItem, removeItemFromTier, setHoveredItem, showDetails }: UseAppShortcutsProps,
) {
  if (hoveredItem) {
    // 'x' to remove item (only if in a tier)
    if (event.key === 'x' && hoveredItem.tierId) {
      event.preventDefault();
      removeItemFromTier(hoveredItem.tierId, hoveredItem.item.id);
      setHoveredItem(null);
    }
    // 'i' to show details
    if (event.key === 'i') {
      event.preventDefault();
      showDetails(hoveredItem.item);
    }
  }
}

function handleGlobalShortcuts(
  event: KeyboardEvent,
  { setShowExportPreview, closeDetails, setShowShortcuts, setShowDebugPanel }: UseAppShortcutsProps,
) {
  // Toggle Export Preview (Shift + P)
  if (event.shiftKey && event.key.toLowerCase() === 'p') {
    event.preventDefault();
    setShowExportPreview((prev) => !prev);
  }

  // Toggle Debug Panel (Shift + D)
  if (event.shiftKey && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    setShowDebugPanel((prev) => !prev);
  }

  // Toggle Shortcuts (Shift + ? or ?)
  if (event.key === '?') {
    event.preventDefault();
    setShowShortcuts((prev) => !prev);
  }

  // Close on ESC
  if (event.key === 'Escape') {
    setShowExportPreview(false);
    closeDetails();
    setShowShortcuts(false);
  }
}

/**
 * Custom hook to handle global keyboard shortcuts.
 * @param props - The properties for the hook.
 */
function useAppShortcuts(props: UseAppShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (handleUndoRedo(e, props)) return;
      handleHoverShortcuts(e, props);
      handleGlobalShortcuts(e, props);
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
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
 * @returns The main application component.
 */
export default function TierListApp() {
  const {
    state,
    isHydrated,
    actions: { randomizeColors, removeItemFromTier, updateMediaItem },
    dnd: { sensors, activeItem, activeTier, handleDragStart, handleDragOver, handleDragEnd },
    ui: { headerColors, detailsItem, allBoardItems, showDetails, closeDetails, setShowShortcuts },
    history: { undo, redo, canUndo, canRedo },
  } = useTierListContext();

  const { toastCount } = useToast();
  const { takeScreenshot: capture, isCapturing } = useScreenshot('moat-tierlist.png');
  const handleScreenshot = () => capture(state, headerColors);

  // UI Interaction State (Hover)
  const [hoveredItem, setHoveredItem] = useState<HoveredItemInfo | null>(null);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Background Bundler: Automatically syncs deep metadata for items on the board
  const { pendingCount } = useBackgroundEnrichment(allBoardItems, updateMediaItem);

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
    setShowShortcuts,
    setShowExportPreview,
    setShowDebugPanel,
  });

  if (!isHydrated) {
    return <LoadingState />;
  }

  let dragOverlayContent = null;
  if (activeTier) {
    dragOverlayContent = (
      <div className="pointer-events-none w-full opacity-80">
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
    );
  } else if (activeItem) {
    dragOverlayContent = <MediaCard item={activeItem} />;
  }

  return (
    <div className="relative flex min-h-screen flex-col font-sans text-neutral-200">
      <InteractionContext.Provider value={{ setHoveredItem }}>
        <main className="flex-1 p-8 pb-0">
          <div className="mx-auto max-w-[1600px]">
            <Header onScreenshot={handleScreenshot} isCapturing={isCapturing} />

            <DndContext
              sensors={sensors}
              collisionDetection={rectIntersection}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_450px]">
                <div>
                  <TierBoard isAnyDragging={!!activeItem || !!activeTier} />
                </div>

                <SearchPanel />
              </div>

              <DragOverlay>{dragOverlayContent}</DragOverlay>
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
          className={`group screenshot-exclude fixed right-8 z-50 rounded-full bg-neutral-800 p-4 text-white shadow-2xl transition-all hover:scale-110 hover:bg-neutral-700 active:scale-95 ${fabPosition}`}
          title="Randomize Colors"
        >
          <Dices size={24} className="transition-transform group-hover:rotate-12" />
        </button>

        {/* Export Preview Overlay */}
        {showExportPreview && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center overflow-auto bg-black/90 p-20 backdrop-blur-sm">
            <div className="relative">
              {/* Preview Header */}
              <div className="absolute -top-12 right-0 left-0 flex items-center justify-between px-4">
                <span className="font-mono text-xs tracking-widest text-neutral-500 uppercase">
                  Export Preview (Shift+P to close)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleScreenshot}
                    disabled={isCapturing}
                    className="flex items-center gap-2 rounded bg-neutral-800 px-3 py-2 text-sm text-white transition-all hover:bg-neutral-700 active:scale-95 disabled:opacity-50"
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
                    className="rounded bg-neutral-800 p-2 text-white transition-colors hover:bg-neutral-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* The Actual Export Surface */}
              <div className="border border-neutral-800 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                <ExportBoard state={state} brandColors={headerColors} />
              </div>

              <div className="mt-8 text-center text-sm text-neutral-600">
                This is a live preview of the export board. Interaction is disabled here.
              </div>
            </div>
          </div>
        )}

        {/* Page Footer */}
        <Footer colors={footerBrandColors} className="pt-4 pb-6 opacity-60" />
      </InteractionContext.Provider>
      <DebugPanel pendingEnrichmentCount={pendingCount} />
      <Leva hidden={!showDebugPanel} />
    </div>
  );
}
