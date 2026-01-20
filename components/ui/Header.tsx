/**
 * @file Header.tsx
 * @description The main application header component.
 * Contains global actions such as Import, Export, Screenshot, and Clear Board.
 * Displays the dynamic Brand Logo which adapts to the current board colors.
 * @module Header
 */

'use client';

import {
  Camera,
  ChevronLeft,
  Download,
  Keyboard,
  Loader2,
  Redo2,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useTierListContext } from '@/components/TierListContext';
import { useBrandColors } from '@/lib/hooks/useBrandColors';

import { BoardTitle } from '../board/BoardTitle';
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
 * @param props.onScreenshot
 * @param props.isCapturing
 */
export function Header({ onScreenshot, isCapturing }: HeaderProps) {
  const {
    state,
    actions: { import: handleImport, export: handleExport, clear: handleClear, updateTitle },
    ui: { headerColors },
    history: { undo, redo, canUndo, canRedo, push: pushHistory },
  } = useTierListContext();

  const brandColors = useBrandColors(headerColors);
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <header className="pointer-events-none relative z-50 mb-8 flex flex-col items-center gap-4 md:grid md:grid-cols-[auto_1fr_auto]">
      <div className="group pointer-events-auto flex items-center">
        <Link
          href="/"
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

      <div className="pointer-events-auto flex gap-2">
        <div className="mr-2 flex gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="rounded bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="rounded bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>
          <div className="mx-1 w-px bg-neutral-800"></div>
          <button
            onClick={() => setShowShortcuts(true)}
            className="rounded bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white"
            title="Keyboard Shortcuts"
          >
            <Keyboard size={16} />
          </button>
        </div>

        <label
          className="flex cursor-pointer items-center gap-2 rounded bg-neutral-800 px-3 py-2 text-sm transition-colors hover:bg-neutral-700"
          title="Import from JSON"
        >
          <Upload size={16} /> <span className="hidden sm:inline">Import</span>
          <input type="file" onChange={handleImport} accept=".json" className="hidden" />
        </label>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded bg-neutral-800 px-3 py-2 text-sm transition-colors hover:bg-neutral-700"
          title="Export to JSON"
        >
          <Download size={16} /> <span className="hidden sm:inline">Export</span>
        </button>
        <button
          onClick={onScreenshot}
          disabled={isCapturing}
          className="flex items-center gap-2 rounded bg-neutral-800 px-3 py-2 text-sm transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          title="Save as Image"
        >
          {isCapturing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          <span className="hidden sm:inline">Save</span>
        </button>
        <div className="mx-1 w-px bg-neutral-800"></div>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 rounded border border-red-900/50 bg-red-900/20 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-900/40"
          title="Clear Board"
        >
          <Trash2 size={16} /> <span className="hidden sm:inline">Clear</span>
        </button>

        <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </div>
    </header>
  );
}
