/**
 * @file SearchSettings.tsx
 * @description A dropdown menu component for configuring global search behavior.
 * Allows users to toggle "Fuzzy Search" and "Wildcard Matching" preferences.
 * @module SearchSettings
 */

import { Settings, X } from 'lucide-react';
import { useState } from 'react';

import { Popover } from '../ui/Popover';

/**
 * Props for the SearchSettings component.
 */
interface SearchSettingsProps {
  /** Whether fuzzy matching is currently enabled. */
  fuzzyEnabled: boolean;
  /** Whether wildcard matching is currently enabled. */
  wildcardEnabled: boolean;
  /** Callback fired when the fuzzy setting is toggled. */
  onFuzzyChange: (enabled: boolean) => void;
  /** Callback fired when the wildcard setting is toggled. */
  onWildcardChange: (enabled: boolean) => void;
}

/**
 * Renders a settings menu for configuring search behavior (fuzzy, wildcard).
 * @param props - The props for the component.
 * @param props.fuzzyEnabled - Whether fuzzy matching is currently enabled.
 * @param props.wildcardEnabled - Whether wildcard matching is currently enabled.
 * @param props.onFuzzyChange - Callback fired when the fuzzy setting is toggled.
 * @param props.onWildcardChange - Callback fired when the wildcard setting is toggled.
 * @returns The rendered SearchSettings component.
 */
export function SearchSettings({
  fuzzyEnabled,
  wildcardEnabled,
  onFuzzyChange,
  onWildcardChange,
}: SearchSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      contentClassName="top-full right-0"
      trigger={
        <button
          className={`rounded-full p-2 transition-colors ${isOpen ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:bg-neutral-800 hover:text-white'}`}
          title="Search Settings"
        >
          <Settings size={16} />
        </button>
      }
    >
      <div className="w-72 rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Search Settings</h3>
          <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Search Options */}
          <div>
            <h4 className="mb-2 text-xs font-bold text-neutral-400 uppercase">Search Logic</h4>
            <div className="space-y-3">
              <label className="group flex cursor-pointer items-center justify-between text-xs text-neutral-300">
                <span>Fuzzy Search (Typos)</span>
                <input
                  type="checkbox"
                  checked={fuzzyEnabled}
                  onChange={(e) => onFuzzyChange(e.target.checked)}
                  className="accent-red-600"
                />
              </label>
              <p className="text-[10px] text-neutral-500">
                Finds matches even if you make spelling mistakes.
              </p>

              <div className="my-1 h-px bg-neutral-800" />

              <label className="group flex cursor-pointer items-center justify-between text-xs text-neutral-300">
                <span>Partial Match (Wildcard)</span>
                <input
                  type="checkbox"
                  checked={wildcardEnabled}
                  onChange={(e) => onWildcardChange(e.target.checked)}
                  className="accent-red-600"
                />
              </label>
              <p className="text-[10px] text-neutral-500">
                Finds matches starting with your query.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Popover>
  );
}
