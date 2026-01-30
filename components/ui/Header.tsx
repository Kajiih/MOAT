/**
 * @file Header.tsx
 * @description The main application header component.
 * Contains global actions such as Import, Export, Screenshot, and Clear Board.
 * Displays the dynamic Brand Logo which adapts to the current board colors.
 * @module Header
 */

'use client';

import { Camera, ChevronLeft, CloudUpload, Loader2, Redo2, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useTierListContext } from '@/components/providers/TierListContext';
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider';
import { ShareModal } from '@/components/share/ShareModal';
import { useBrandColors } from '@/lib/hooks/useBrandColors';

import { BoardTitle } from '../board/BoardTitle';
import { BoardOptionsMenu } from './BoardOptionsMenu';
import { BrandLogo } from './BrandLogo';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

/**
 * Props for the Header component.
 */
interface HeaderProps {
  /** Callback fired when the user clicks the screenshot button. */
  onScreenshot: () => void;
  /** Whether a screenshot capture is currently in progress. */
  isCapturing?: boolean;
}

/**
 * Renders the primary application header, providing access to global board actions.
 * Manages branding, undo/redo state, and import/export functionality.
 * @param props - The props for the component.
 * @param props.onScreenshot - Callback fired when the user clicks the screenshot button.
 * @param props.isCapturing - Whether a screenshot capture is currently in progress.
 * @returns The rendered Header component.
 */
export function Header({ onScreenshot, isCapturing }: HeaderProps) {
  const {
    state,
    actions: {
      import: handleImport,
      export: handleExport,
      publish: handlePublish,
      clear: handleClear,
      updateTitle,
      updateCategory,
    },
    ui: { headerColors, showShortcuts, setShowShortcuts },
    history: { undo, redo, canUndo, canRedo, push: pushHistory },
  } = useTierListContext();

  const { showAdvanced, setShowAdvanced } = useUserPreferences();

  const brandColors = useBrandColors(headerColors);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const onPublish = async () => {
    setIsPublishing(true);
    const id = await handlePublish();
    if (id) {
      const url = `${globalThis.location.origin}/share/${id}`;
      setShareUrl(url);
    }
    setIsPublishing(false);
  };

  return (
    <header className="pointer-events-none relative z-50 mb-8 flex flex-col items-center gap-4 md:grid md:grid-cols-[auto_1fr_auto]">
      <div className="group pointer-events-auto flex items-center">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg p-1 pr-3 transition-colors hover:bg-neutral-800"
          title="Back to Dashboard"
        >
          <ChevronLeft size={20} className="text-neutral-500 group-hover:text-neutral-300" />
          <BrandLogo colors={brandColors} variant="header" />
          <span className="hidden text-sm font-bold text-neutral-600 group-hover:text-neutral-400 lg:inline">
            / Dashboard
          </span>
        </Link>
      </div>

      <div className="pointer-events-auto flex w-full justify-center">
        <BoardTitle title={state.title} onChange={updateTitle} onFocus={() => pushHistory()} />
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <div className="mr-2 flex gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={18} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            title="Publish to Cloud"
          >
            {isPublishing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CloudUpload size={18} />
            )}
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={onScreenshot}
            disabled={isCapturing}
            className="flex h-10 items-center gap-2 rounded-lg bg-neutral-800 px-4 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Save as Image"
          >
            {isCapturing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            <span className="hidden sm:inline">Save</span>
          </button>

          <BoardOptionsMenu
            onImport={handleImport}
            onExport={handleExport}
            onClear={handleClear}
            onShowShortcuts={() => setShowShortcuts(true)}
            showAdvanced={showAdvanced}
            onToggleAdvanced={setShowAdvanced}
            currentCategory={state.category}
            onUpdateCategory={updateCategory}
          />
        </div>

        <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        <ShareModal
          isOpen={!!shareUrl}
          onClose={() => setShareUrl(null)}
          shareUrl={shareUrl || ''}
        />
      </div>
    </header>
  );
}
