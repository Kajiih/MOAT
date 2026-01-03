'use client';

import { Upload, Download, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface HeaderProps {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onClear: () => void;
  colors: string[]; // Expecting at least 4 colors
}

export function Header({ onImport, onExport, onClear, colors }: HeaderProps) {
  const letters = ['M', 'O', 'A', 'T'];

  return (
    <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <h1 className="text-4xl font-black tracking-tighter uppercase italic select-none flex">
        {letters.map((letter, i) => {
            const bgClass = colors[i];
            // If color exists, use it. Otherwise, hide the letter
            const className = bgClass 
                ? bgClass.replace('bg-', 'text-') 
                : 'opacity-0 pointer-events-none';

            return (
                <span key={i} className={twMerge(className, "transition-all duration-500")}>
                    {letter}
                </span>
            );
        })}
      </h1>
      
      <div className="flex gap-2">
        <label className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded cursor-pointer hover:bg-neutral-700 text-sm">
            <Upload size={16} /> Import
            <input type="file" onChange={onImport} accept=".json" className="hidden" />
        </label>
        <button onClick={onExport} className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded hover:bg-neutral-700 text-sm">
            <Download size={16} /> Export
        </button>
        <button onClick={onClear} className="flex items-center gap-2 px-3 py-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40 text-sm border border-red-900/50">
            <Trash2 size={16} /> Clear
        </button>
      </div>
    </header>
  );
}
