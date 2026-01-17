/**
 * @file Header.tsx
 * @description The main application header component.
 * Contains global actions such as Import, Export, Screenshot, and Clear Board.
 * Displays the dynamic Brand Logo which adapts to the current board colors.
 * @module Header
 */

'use client';

import { Upload, Download, Trash2, Camera, Loader2, Undo2, Redo2, Keyboard, ChevronLeft } from 'lucide-react';
import { useBrandColors } from '@/lib/hooks/useBrandColors';
import { BrandLogo } from './BrandLogo';
import { useState } from 'react';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { useTierListContext } from '@/components/TierListContext';
import { BoardTitle } from '../board/BoardTitle';
import Link from 'next/link';

interface HeaderProps {
  onScreenshot: () => void;
  isCapturing?: boolean;
}

export function Header({ 
    onScreenshot, 
    isCapturing, 
}: HeaderProps) {
  
  const { 
      state,
      actions: { import: handleImport, export: handleExport, clear: handleClear, updateTitle },
      ui: { headerColors },
      history: { undo, redo, canUndo, canRedo, push: pushHistory }
  } = useTierListContext();

  const brandColors = useBrandColors(headerColors);
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <header className="flex flex-col md:grid md:grid-cols-[auto_1fr_auto] items-center mb-8 gap-4 relative z-50 pointer-events-none">
      <div className="pointer-events-auto flex items-center group">
        <Link 
            href="/" 
            className="flex items-center gap-2 hover:bg-neutral-800 p-1 pr-3 rounded-lg transition-colors"
            title="Back to Dashboard"
        >
            <ChevronLeft size={20} className="text-neutral-500 group-hover:text-neutral-300" />
            <BrandLogo colors={brandColors} variant="header" />
            <span className="text-sm font-bold text-neutral-600 group-hover:text-neutral-400 hidden lg:inline">/ Dashboard</span>
        </Link>
      </div>
      
      <div className="flex justify-center pointer-events-auto w-full">
        <BoardTitle 
            title={state.title}
            onChange={updateTitle}
            onFocus={() => pushHistory()}
        />
      </div>
      
      <div className="flex gap-2 pointer-events-auto">
        <div className="flex gap-1 mr-2">
            <button 
                onClick={undo} 
                disabled={!canUndo}
                className="p-2 bg-neutral-800 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo (Ctrl+Z)"
            >
                <Undo2 size={16} />
            </button>
            <button 
                onClick={redo} 
                disabled={!canRedo}
                className="p-2 bg-neutral-800 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Redo (Ctrl+Shift+Z)"
            >
                <Redo2 size={16} />
            </button>
            <div className="w-px bg-neutral-800 mx-1"></div>
            <button 
                onClick={() => setShowShortcuts(true)} 
                className="p-2 bg-neutral-800 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                title="Keyboard Shortcuts"
            >
                <Keyboard size={16} />
            </button>
        </div>

        <label className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded cursor-pointer hover:bg-neutral-700 text-sm transition-colors" title="Import from JSON">
            <Upload size={16} /> <span className="hidden sm:inline">Import</span>
            <input type="file" onChange={handleImport} accept=".json" className="hidden" />
        </label>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded hover:bg-neutral-700 text-sm transition-colors" title="Export to JSON">
            <Download size={16} /> <span className="hidden sm:inline">Export</span>
        </button>
        <button 
            onClick={onScreenshot} 
            disabled={isCapturing}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded hover:bg-neutral-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
            title="Save as Image"
        >
            {isCapturing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            <span className="hidden sm:inline">Save</span>
        </button>
        <div className="w-px bg-neutral-800 mx-1"></div>
        <button onClick={handleClear} className="flex items-center gap-2 px-3 py-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40 text-sm border border-red-900/50 transition-colors" title="Clear Board">
            <Trash2 size={16} /> <span className="hidden sm:inline">Clear</span>
        </button>

        <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </div>
    </header>
  );
}
