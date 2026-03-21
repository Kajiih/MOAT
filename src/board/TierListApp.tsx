/**
 * @file TierListApp.tsx
 * @description The main container component for the application.
 * Composes the Drag-and-Drop context, Header, Tier Board, and Search Panel.
 * Acts as the entry point for the interactive tier list experience.
 * @module TierListApp
 */

'use client';

import { Leva } from 'leva';
import { Camera, Dices, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Footer } from '@/app/_components/Footer';
import { Header } from '@/app/_components/Header';
import { useTierListContext } from '@/board/context';
import { DebugPanel } from '@/board/DebugPanel';
import { ExportBoard } from '@/board/ExportBoard';
import { useBrandColors } from '@/board/hooks/useBrandColors';
import { useDynamicFavicon } from '@/board/hooks/useDynamicFavicon';
import { useScreenshot } from '@/board/hooks/useScreenshot';
import { TierBoard } from '@/board/TierBoard';
import { Item, TierListState } from '@/board/types';
import { DetailsModal } from '@/items/DetailsModal';
import { getColorTheme } from '@/lib/colors';
import { InteractionContext } from '@/lib/ui/InteractionContext';
import { useToast } from '@/lib/ui/ToastProvider';
import { SearchPanel } from '@/search/SearchPanel';

/**
 * Simple loading screen displayed while persisted state is being hydrated.
 * Shows a pulsing animation of the "MOAT" logo.
 * @returns A loading state component.
 */
const LoadingState = () => {
  const letters = ['M', 'O', 'A', 'T'];
  const colors = ['red', 'orange', 'amber', 'green']; // Preview colors

  return (
    <div className="bg-surface text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-8 font-sans">
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
      <div className="text-secondary text-sm">Loading application...</div>
    </div>
  );
};

interface UseAppShortcutsProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hoveredItem: Item | null;
  setHoveredItem: (item: Item | null) => void;
  removeItemFromTier: (tierId: string, itemId: string) => void;
  showDetails: (item: Item) => void;
  closeDetails: () => void;
  setShowShortcuts: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowExportPreview: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowDebugPanel: (show: boolean | ((prev: boolean) => boolean)) => void;
  state: TierListState;
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
  { hoveredItem, removeItemFromTier, setHoveredItem, showDetails, state }: UseAppShortcutsProps,
) {
  if (hoveredItem) {
    // 'x' to remove item (only if in a tier)
    if (event.key === 'x') {
      let foundTierId: string | null = null;
      for (const [tierId, itemIds] of Object.entries(state.tierLayout)) {
        if (itemIds.includes(hoveredItem.id)) {
          foundTierId = tierId;
          break;
        }
      }
      if (foundTierId) {
        event.preventDefault();
        removeItemFromTier(foundTierId, hoveredItem.id);
        setHoveredItem(null);
      }
    }
    // 'i' to show details
    if (event.key === 'i') {
      event.preventDefault();
      showDetails(hoveredItem);
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
      // Don't trigger global shortcuts if the user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) &&
        e.key !== 'Escape'
      ) {
        return;
      }

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
    dragState: { activeItem, activeTier },
    actions: { randomizeColors, removeItemFromTier, updateItem },

    ui: { headerColors, detailsItem, showDetails, closeDetails, setShowShortcuts },
    history: { undo, redo, canUndo, canRedo },
  } = useTierListContext();

  const { toastCount } = useToast();
  const { takeScreenshot: capture, isCapturing } = useScreenshot('moat-tierlist.png');
  const handleScreenshot = () => capture(state, headerColors);

  // UI Interaction State (Hover)
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

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
    state,
  });

  if (!isHydrated) {
    return <LoadingState />;
  }

  return (
    <div className="text-foreground bg-background relative flex min-h-screen flex-col font-sans">
      <InteractionContext.Provider value={{ hoveredItem, setHoveredItem }}>
        <main className="flex-1 p-8 pb-0">
          <div className="mx-auto max-w-[1600px]">
            <Header onScreenshot={handleScreenshot} isCapturing={isCapturing} />

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_450px]">
              <div>
                <TierBoard isAnyDragging={!!activeItem || !!activeTier} />
              </div>

              <SearchPanel />
            </div>
          </div>
        </main>

        <DetailsModal
          key={detailsItem?.id || 'modal'}
          item={detailsItem}
          isOpen={!!detailsItem}
          onClose={closeDetails}
          onUpdateItem={updateItem}
          onNavigate={showDetails}
        />

        {/* Floating Randomize Colors Button */}
        <button
          onClick={randomizeColors}
          className={`group screenshot-exclude bg-surface-hover text-foreground shadow-floating hover:bg-surface fixed right-8 z-50 rounded-full p-4 transition-all hover:scale-110 active:scale-95 ${fabPosition}`}
          title="Randomize Colors"
        >
          <Dices size={24} className="transition-transform group-hover:rotate-12" />
        </button>

        {/* Export Preview Overlay */}
        {showExportPreview && (
          <div className="z-overlay fixed inset-0 flex flex-col items-center overflow-auto bg-black/90 p-20 backdrop-blur-sm">
            <div className="relative">
              {/* Preview Header */}
              <div className="absolute -top-12 right-0 left-0 flex items-center justify-between px-4">
                <span className="text-secondary font-mono text-xs tracking-widest uppercase">
                  Export Preview (Shift+P to close)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleScreenshot}
                    disabled={isCapturing}
                    className="bg-surface-hover text-foreground hover:bg-surface flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all active:scale-95 disabled:opacity-50"
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
                    className="bg-surface-hover text-foreground hover:bg-surface rounded-md p-2 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* The Actual Export Surface */}
              <div className="border-border border shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                <ExportBoard state={state} brandColors={headerColors} />
              </div>

              <div className="text-muted mt-8 text-center text-sm">
                This is a live preview of the export board. Interaction is disabled here.
              </div>
            </div>
          </div>
        )}

        {/* Page Footer */}
        <Footer colors={footerBrandColors} className="pt-4 pb-6 opacity-60" />
      </InteractionContext.Provider>
      <DebugPanel pendingEnrichmentCount={0} />
      <Leva hidden={!showDebugPanel} />
    </div>
  );
}
