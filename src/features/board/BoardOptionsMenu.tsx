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
  cardPrefs: {
    showIcon: boolean;
    showUnderlay: boolean;
    coloredIcon: boolean;
    epicProbability: number;
  };
  onToggleCardPref: (
    pref: 'showIcon' | 'showUnderlay' | 'coloredIcon' | 'epicProbability',
    value: boolean | number,
  ) => void;
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
 * @param props.cardPrefs - Object containing card visual preferences (icons, accent strips, etc.).
 * @param props.onToggleCardPref - Callback fired when a visual preference is toggled.
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
  cardPrefs,
  onToggleCardPref,
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
              Currently just shows a few more stuff.
            </p>
          </div>

          {showAdvanced && (
            <>
              <div className="bg-surface-hover my-2 h-px" />

              {/* Card Visual Prefs */}
              <div className="space-y-2 px-3 py-2">
                <h4 className="text-secondary mb-1 text-[10px] font-bold tracking-wider uppercase">
                  Card Visuals
                </h4>

                <label className="text-secondary flex cursor-pointer items-center justify-between text-sm">
                  <span>Show Type Icon</span>
                  <div
                    className={twMerge(
                      'relative h-5 w-9 cursor-pointer rounded-full transition-colors',
                      cardPrefs.showIcon ? 'bg-primary' : 'bg-surface-hover',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCardPref('showIcon', !cardPrefs.showIcon);
                    }}
                  >
                    <div
                      className={twMerge(
                        'absolute top-1 h-3 w-3 rounded-full bg-white transition-all',
                        cardPrefs.showIcon ? 'left-5' : 'left-1',
                      )}
                    />
                  </div>
                </label>

                {cardPrefs.showIcon && (
                  <label className="text-secondary ml-1 flex cursor-pointer items-center justify-between border-l border-white/5 pl-4 text-sm">
                    <span className="text-muted text-[12px]">Colorize Icon</span>
                    <div
                      className={twMerge(
                        'relative h-4 w-7 cursor-pointer rounded-full transition-colors',
                        cardPrefs.coloredIcon ? 'bg-primary' : 'bg-surface-hover',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCardPref('coloredIcon', !cardPrefs.coloredIcon);
                      }}
                    >
                      <div
                        className={twMerge(
                          'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
                          cardPrefs.coloredIcon ? 'left-3.5' : 'left-0.5',
                        )}
                      />
                    </div>
                  </label>
                )}

                <label className="text-secondary flex cursor-pointer items-center justify-between text-sm">
                  <span>Show Accent Strip</span>
                  <div
                    className={twMerge(
                      'relative h-5 w-9 cursor-pointer rounded-full transition-colors',
                      cardPrefs.showUnderlay ? 'bg-primary' : 'bg-surface-hover',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCardPref('showUnderlay', !cardPrefs.showUnderlay);
                    }}
                  >
                    <div
                      className={twMerge(
                        'absolute top-1 h-3 w-3 rounded-full bg-white transition-all',
                        cardPrefs.showUnderlay ? 'left-5' : 'left-1',
                      )}
                    />
                  </div>
                </label>

                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>Epic Animations Rate</span>
                    <span className="text-primary font-bold">{cardPrefs.epicProbability}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={cardPrefs.epicProbability}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleCardPref('epicProbability', Number.parseInt(e.target.value));
                    }}
                    className="bg-surface-hover accent-primary h-1 w-full cursor-pointer appearance-none rounded-lg"
                  />
                </div>
              </div>
            </>
          )}

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
