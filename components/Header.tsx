'use client';

import { Upload, Download, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface HeaderProps {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onClear: () => void;
  colors: string[]; // Expecting at least 4 colors
}

// Map tier background colors to optimal text colors for the logo
const LOGO_COLOR_MAP: Record<string, string> = {
  'bg-red-500': 'text-red-500',
  'bg-orange-500': 'text-orange-500',
  'bg-amber-400': 'text-amber-400',
  'bg-yellow-300': 'text-yellow-300',
  'bg-lime-400': 'text-lime-400',
  'bg-green-500': 'text-green-500',
  'bg-teal-400': 'text-teal-400',
  'bg-cyan-400': 'text-cyan-400',
  'bg-blue-500': 'text-blue-400', // Lighter for better contrast
  'bg-indigo-500': 'text-indigo-400', // Lighter
  'bg-purple-500': 'text-purple-400', // Lighter
  'bg-pink-500': 'text-pink-400', // Lighter
  'bg-rose-500': 'text-rose-500',
  'bg-neutral-500': 'text-neutral-400',
  'bg-slate-700': 'text-slate-400',
};

export function Header({ onImport, onExport, onClear, colors }: HeaderProps) {
  const letters = ['M', 'O', 'A', 'T'];

  return (
    <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <h1 className="text-4xl font-black tracking-tighter uppercase italic select-none flex">
        {letters.map((letter, i) => {
            const bgClass = colors[i];
            
            // Use mapped color if available, otherwise fallback to simple replacement, or hide if no color
            let className = 'opacity-0 pointer-events-none';
            
            if (bgClass) {
                className = LOGO_COLOR_MAP[bgClass] || bgClass.replace('bg-', 'text-');
            }

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
