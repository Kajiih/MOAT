/**
 * @file BoardOptionsMenu.tsx
 * @description A dropdown menu for grouping secondary board actions.
 */

'use client';

import {
  Download,
  Keyboard,
  MoreVertical,
  RotateCcw,
  Settings2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { Popover } from '@/core/ui/Popover';

interface BoardOptionsMenuProps {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onClear: () => void;
  onResetItems: () => void;
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
 * @param props.onResetItems - Callback fired when the user clicks the reset items button.
 * @param props.onShowShortcuts - Callback fired when the user clicks the shortcuts button.
 * @param props.showAdvanced - Whether advanced mode is currently enabled.
 * @param props.onToggleAdvanced - Callback fired when the user toggles advanced mode.
 * @returns The rendered dropdown menu.
 */
export function BoardOptionsMenu({
  onImport,
  onExport,
  onClear,
  onResetItems,
  onShowShortcuts,
  showAdvanced,
  onToggleAdvanced,
}: BoardOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      contentClassName="right-0 top-full"
      trigger={
        <button
          className={twMerge(
            'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
            isOpen
              ? 'bg-surface-hover text-foreground'
              : 'text-secondary hover:bg-surface-hover hover:text-foreground',
          )}
          title="Board Options"
        >
          <MoreVertical size={20} />
        </button>
      }
    >
      <div className="border-border bg-surface shadow-floating w-64 origin-top-right rounded-lg border p-2 ring-1 ring-black/50">
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="text-secondary text-xs font-bold tracking-wider uppercase">
            Board Options
          </h3>
          <button onClick={() => setIsOpen(false)} className="text-secondary hover:text-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="mt-1 space-y-1">
          <button
            onClick={() => {
              onShowShortcuts();
              setIsOpen(false);
            }}
            className="text-secondary hover:bg-surface-hover hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
          >
            <Keyboard size={18} className="text-secondary" />
            <span>Keyboard Shortcuts</span>
            <kbd className="border-border text-caption text-secondary ml-auto flex h-5 items-center rounded-md border bg-black px-1.5">
              ?
            </kbd>
          </button>

          <label className="text-secondary hover:bg-surface-hover hover:text-foreground flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors">
            <Upload size={18} className="text-secondary" />
            <span>Import JSON</span>
            <input
              type="file"
              onChange={(e) => {
                onImport(e);
                setIsOpen(false);
              }}
              accept=".json"
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              onExport();
              setIsOpen(false);
            }}
            className="text-secondary hover:bg-surface-hover hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
          >
            <Download size={18} className="text-secondary" />
            <span>Export JSON</span>
          </button>

          <div className="bg-surface-hover my-2 h-px" />

          <div className="px-3 py-2">
            <label className="text-secondary flex cursor-pointer items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <Settings2 size={18} className="text-secondary" />
                <span>Advanced Mode</span>
              </div>
              <div
                className={twMerge(
                  'relative h-5 w-9 rounded-full transition-colors',
                  showAdvanced ? 'bg-primary' : 'bg-surface-hover',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAdvanced(!showAdvanced);
                }}
              >
                <div
                  className={twMerge(
                    'absolute top-1 h-3 w-3 rounded-full bg-white transition-all',
                    showAdvanced ? 'left-5' : 'left-1',
                  )}
                />
              </div>
            </label>
            <p className="text-secondary mt-1.5 text-[11px] leading-relaxed">
              Enables technical configuration like fuzzy search and wildcard matching.
            </p>
          </div>

          <div className="bg-surface-hover my-2 h-px" />

          <button
            onClick={() => {
              onResetItems();
              setIsOpen(false);
            }}
            data-testid="reset-items-button"
            className="text-secondary hover:bg-surface-hover hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
          >
            <RotateCcw size={18} className="text-secondary" />
            <span>Reset items to unranked</span>
          </button>

          <button
            onClick={() => {
              onClear();
              setIsOpen(false);
            }}
            data-testid="clear-board-button"
            className="text-destructive flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={18} />
            <span>Clear Board</span>
          </button>
        </div>
      </div>
    </Popover>
  );
}
