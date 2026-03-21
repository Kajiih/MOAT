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

import { ShareModal } from '@/app/share/_components/ShareModal';
import { BoardOptionsMenu } from '@/presentation/board/BoardOptionsMenu';
import { BoardTitle } from '@/presentation/board/BoardTitle';
import { useTierListContext } from '@/presentation/board/context';
import { useBrandColors } from '@/presentation/board/hooks/useBrandColors';
import { KeyboardShortcutsModal } from '@/presentation/board/KeyboardShortcutsModal';
import { useUserPreferences } from '@/presentation/ui/UserPreferencesProvider';

import { BrandLogo } from './BrandLogo';

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
      resetItems: handleResetItems,
      updateTitle,
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
          className="hover:bg-surface-hover flex items-center gap-2 rounded-lg p-1 pr-3 transition-colors"
          title="Back to Dashboard"
        >
          <ChevronLeft size={20} className="text-secondary group-hover:text-neutral-300" />
          <BrandLogo colors={brandColors} variant="header" />
          <span className="text-muted group-hover:text-secondary hidden text-sm font-bold lg:inline">
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
            className="bg-surface text-secondary hover:bg-surface-hover hover:text-foreground flex h-10 w-10 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="bg-surface text-secondary hover:bg-surface-hover hover:text-foreground flex h-10 w-10 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={18} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="bg-primary flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="bg-surface-hover text-secondary hover:bg-surface hover:text-foreground flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            title="Save as Image"
          >
            {isCapturing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            <span className="hidden sm:inline">Save</span>
          </button>

          <BoardOptionsMenu
            onImport={handleImport}
            onExport={handleExport}
            onClear={handleClear}
            onResetItems={handleResetItems}
            onShowShortcuts={() => setShowShortcuts(true)}
            showAdvanced={showAdvanced}
            onToggleAdvanced={setShowAdvanced}
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
