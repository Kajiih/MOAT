'use client';

import { useState } from 'react';
import { Settings, X } from 'lucide-react';

interface SearchSettingsProps {
  fuzzyEnabled: boolean;
  wildcardEnabled: boolean;
  onFuzzyChange: (enabled: boolean) => void;
  onWildcardChange: (enabled: boolean) => void;
}

export function SearchSettings({
    fuzzyEnabled,
    wildcardEnabled,
    onFuzzyChange,
    onWildcardChange,
}: SearchSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
        title="Search Settings"
      >
        <Settings size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-4 z-50">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-white">Search Settings</h3>
                <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white">
                    <X size={14} />
                </button>
            </div>
            
            <div className="space-y-4">
                {/* Search Options */}
                <div>
                    <h4 className="text-xs font-bold text-neutral-400 mb-2 uppercase">Search Logic</h4>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer group">
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

                        <div className="h-px bg-neutral-800 my-1" />

                        <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer group">
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
      )}
    </div>
  );
}
