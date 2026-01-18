/**
 * @file SearchPanel.tsx
 * @description The sidebar component responsible for searching and filtering media items.
 * It manages the active tab (Album/Artist/Song), global search settings, and renders persistent SearchTabs.
 * @module SearchPanel
 */

'use client';

import { Disc, Eye, EyeOff, Mic2, Music, Search } from 'lucide-react';

import { useTierListContext } from '@/components/TierListContext';
import { usePersistentState } from '@/lib/hooks';
import { MediaType } from '@/lib/types';

import { SearchSettings } from './SearchSettings';
import { SearchTab } from './SearchTab';

/**
 * The sidebar component responsible for searching and filtering media items.
 * It manages the active tab (Album/Artist/Song) and renders persistant SearchTabs for each.
 */
const SEARCH_MODES = [
  { type: 'song', label: 'Song', icon: Music },
  { type: 'album', label: 'Album', icon: Disc },
  { type: 'artist', label: 'Artist', icon: Mic2 },
] as const;

/**
 * The sidebar component responsible for searching and filtering media items.
 * It manages the active tab (Album/Artist/Song) and renders persistant SearchTabs for each.
 */
export function SearchPanel() {
  const {
    ui: { addedItemIds, showDetails: onInfo },
    actions: { locate: handleLocate },
  } = useTierListContext();

  const [activeType, setActiveType] = usePersistentState<MediaType>(
    'moat-search-active-type',
    'song',
  );
  const [showAdded, setShowAdded] = usePersistentState<boolean>('moat-search-show-added', true);

  // Global Search Settings (Synchronized across all tabs and filters)
  const [fuzzy, setFuzzy] = usePersistentState<boolean>('moat-search-fuzzy', true);
  const [wildcard, setWildcard] = usePersistentState<boolean>('moat-search-wildcard', true);

  return (
    <div className="sticky top-4 bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col">
      <div className="flex flex-wrap items-center gap-4 mb-4 text-white shrink-0">
        <div className="flex items-center gap-2">
          <Search size={20} />
          <h2 className="text-xl font-bold">Search</h2>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SearchSettings
            fuzzyEnabled={fuzzy}
            wildcardEnabled={wildcard}
            onFuzzyChange={setFuzzy}
            onWildcardChange={setWildcard}
          />

          <button
            onClick={() => setShowAdded(!showAdded)}
            className={`flex items-center gap-2 text-[10px] font-medium px-2 py-1 rounded border transition-colors ${showAdded ? 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-700' : 'bg-blue-900/10 border-blue-900/40 text-blue-400'}`}
            title={
              showAdded ? 'Hide items already on the board' : 'Show items already on the board'
            }
          >
            {showAdded ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>{showAdded ? 'Hide Added' : 'Show Added'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 p-1 bg-black rounded-lg mb-4 shrink-0 border border-neutral-800">
        {SEARCH_MODES.map((mode) => (
          <button
            key={mode.type}
            onClick={() => setActiveType(mode.type)}
            title={`Search ${mode.label}s`}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all
                        ${activeType === mode.type ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                    `}
          >
            <mode.icon size={12} />
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        {SEARCH_MODES.map((mode) => (
          <SearchTab
            key={mode.type}
            type={mode.type}
            addedItemIds={addedItemIds}
            onLocate={handleLocate}
            isHidden={activeType !== mode.type}
            showAdded={showAdded}
            globalFuzzy={fuzzy}
            globalWildcard={wildcard}
            onInfo={onInfo}
          />
        ))}
      </div>
    </div>
  );
}
