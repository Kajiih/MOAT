/**
 * @file BoardOptionsMenu.tsx
 * @description A dropdown menu for grouping secondary board actions.
 */

'use client';

import {
  Download,
  Keyboard,
  MoreVertical,
  Settings2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { useEscapeKey } from '@/lib/hooks/useEscapeKey';

interface BoardOptionsMenuProps {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onClear: () => void;
  onShowShortcuts: () => void;
  showAdvanced: boolean;
  onToggleAdvanced: (value: boolean) => void;
}

/**
 * Renders a dropdown menu for board-wide actions (Import, Export, Settings, etc.).
 * @param props - Component props.
 * @param props.onImport - Callback fired when the user selects a JSON file.
 * @param props.onExport - Callback fired when the user clicks the export button.
 * @param props.onClear - Callback fired when the user clicks the clear button.
 * @param props.onShowShortcuts - Callback fired when the user clicks the shortcuts button.
 * @param props.showAdvanced - Whether advanced mode is currently enabled.
 * @param props.onToggleAdvanced - Callback fired when the user toggles advanced mode.
 * @returns The rendered dropdown menu.
 */
export function BoardOptionsMenu({
  onImport,
  onExport,
  onClear,
  onShowShortcuts,
  showAdvanced,
  onToggleAdvanced,
}: BoardOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEscapeKey(() => setIsOpen(false), isOpen);
  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={twMerge(
          'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
          isOpen ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
        )}
        title="Board Options"
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-64 origin-top-right rounded-xl border border-neutral-800 bg-neutral-900 p-2 shadow-2xl ring-1 ring-black/50">
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Board Options</h3>
            <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white">
              <X size={14} />
            </button>
          </div>

          <div className="mt-1 space-y-1">
            <button
              onClick={() => {
                onShowShortcuts();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              <Keyboard size={18} className="text-neutral-500" />
              <span>Keyboard Shortcuts</span>
              <kbd className="ml-auto flex h-5 items-center rounded border border-neutral-700 bg-black px-1.5 text-[10px] text-neutral-500">
                ?
              </kbd>
            </button>

            <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white">
              <Upload size={18} className="text-neutral-500" />
              <span>Import JSON</span>
              <input type="file" onChange={onImport} accept=".json" className="hidden" />
            </label>

            <button
              onClick={() => {
                onExport();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              <Download size={18} className="text-neutral-500" />
              <span>Export JSON</span>
            </button>

            <div className="my-2 h-px bg-neutral-800" />

            <div className="px-3 py-2">
              <label className="flex cursor-pointer items-center justify-between text-sm text-neutral-300">
                <div className="flex items-center gap-3">
                  <Settings2 size={18} className="text-neutral-500" />
                  <span>Advanced Mode</span>
                </div>
                <div 
                  className={twMerge(
                    "relative h-5 w-9 rounded-full transition-colors",
                    showAdvanced ? "bg-blue-600" : "bg-neutral-700"
                  )}
                  onClick={() => onToggleAdvanced(!showAdvanced)}
                >
                  <div 
                    className={twMerge(
                      "absolute top-1 h-3 w-3 rounded-full bg-white transition-all",
                      showAdvanced ? "left-5" : "left-1"
                    )} 
                  />
                </div>
              </label>
              <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">
                Enables technical configuration like fuzzy search and wildcard matching.
              </p>
            </div>

            <div className="my-2 h-px bg-neutral-800" />

            <button
              onClick={() => {
                onClear();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 size={18} />
              <span>Clear Board</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
