/**
 * @file Header.tsx
 * @description The main application header component.
 * Contains global actions such as Import, Export, Screenshot, and Clear Board.
 * Displays the dynamic Brand Logo which adapts to the current board colors.
 * @module Header
 */

'use client';

import { Upload, Download, Trash2, Camera, Loader2, Undo2, Redo2 } from 'lucide-react';
import { useBrandColors } from '@/lib/hooks/useBrandColors';
import { BrandLogo } from '@/components/BrandLogo';
import { ChangeEvent } from 'react';

interface HeaderProps {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onScreenshot: () => void;
  isCapturing?: boolean;
  onClear: () => void;
  colors: string[]; // Array of Semantic Color IDs (e.g. ['red', 'blue', ...])
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function Header({ 
    onImport, 
    onExport, 
    onScreenshot, 
    isCapturing, 
    onClear, 
    colors,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false
}: HeaderProps) {
  
  const brandColors = useBrandColors(colors);

  return (
    <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 relative z-10">
      <h1>
          <BrandLogo colors={brandColors} variant="header" />
      </h1>
      
      <div className="flex gap-2">
        <div className="flex gap-1 mr-2">
            <button 
                onClick={onUndo} 
                disabled={!canUndo}
                className="p-2 bg-neutral-800 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo (Ctrl+Z)"
            >
                <Undo2 size={16} />
            </button>
            <button 
                onClick={onRedo} 
                disabled={!canRedo}
                className="p-2 bg-neutral-800 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Redo (Ctrl+Shift+Z)"
            >
                <Redo2 size={16} />
            </button>
        </div>

        <label className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded cursor-pointer hover:bg-neutral-700 text-sm transition-colors" title="Import from JSON">
            <Upload size={16} /> <span className="hidden sm:inline">Import</span>
            <input type="file" onChange={onImport} accept=".json" className="hidden" />
        </label>
        <button onClick={onExport} className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded hover:bg-neutral-700 text-sm transition-colors" title="Export to JSON">
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
        <button onClick={onClear} className="flex items-center gap-2 px-3 py-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40 text-sm border border-red-900/50 transition-colors" title="Clear Board">
            <Trash2 size={16} /> <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </header>
  );
}
