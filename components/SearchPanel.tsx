/**
 * @file SearchPanel.tsx
 * @description The sidebar component responsible for searching and filtering media items.
 * It manages the active tab (Album/Artist/Song), global search settings, and renders persistent SearchTabs.
 * @module SearchPanel
 */

'use client';

import { usePersistentState } from '@/lib/hooks';
import { Search, Eye, EyeOff, Disc, Mic2, Music } from 'lucide-react';
import { MediaType, MediaItem } from '@/lib/types';
import { SearchTab } from '@/components/SearchTab';
import { SearchSettings } from '@/components/SearchSettings';

interface SearchPanelProps {
  /** Set of item IDs that are already present on the tier list board. */
  addedItemIds: Set<string>;
  /** Callback to scroll to an item that is already on the board. */
  onLocate: (id: string) => void;
  /** Callback to show details */
  onInfo: (item: MediaItem) => void;
}

/**
 * The sidebar component responsible for searching and filtering media items.
 * It manages the active tab (Album/Artist/Song) and renders persistant SearchTabs for each.
 */
export function SearchPanel({ addedItemIds, onLocate, onInfo }: SearchPanelProps) {
  const [activeType, setActiveType] = usePersistentState<MediaType>('moat-search-active-type', 'song');
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
                    title={showAdded ? "Hide items already on the board" : "Show items already on the board"}
                >
                    {showAdded ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span>{showAdded ? "Hide Added" : "Show Added"}</span>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-black rounded-lg mb-4 shrink-0 border border-neutral-800">
            {(['song', 'album', 'artist'] as const).map((t) => (
                <button
                    key={t}
                    onClick={() => setActiveType(t)}
                    title={`Search ${t}s`}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all
                        ${activeType === t ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                    `}
                >
                    {t === 'album' && <Disc size={12} />}
                    {t === 'artist' && <Mic2 size={12} />}
                    {t === 'song' && <Music size={12} />}
                    <span className="capitalize">{t}</span>
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            <SearchTab 
                type="album" 
                addedItemIds={addedItemIds} 
                onLocate={onLocate} 
                isHidden={activeType !== 'album'}
                showAdded={showAdded}
                globalFuzzy={fuzzy}
                globalWildcard={wildcard}
                onInfo={onInfo}
            />
            <SearchTab 
                type="artist" 
                addedItemIds={addedItemIds} 
                onLocate={onLocate} 
                isHidden={activeType !== 'artist'}
                showAdded={showAdded}
                globalFuzzy={fuzzy}
                globalWildcard={wildcard}
                onInfo={onInfo}
            />
            <SearchTab 
                type="song" 
                addedItemIds={addedItemIds} 
                onLocate={onLocate} 
                isHidden={activeType !== 'song'}
                showAdded={showAdded}
                globalFuzzy={fuzzy}
                globalWildcard={wildcard}
                onInfo={onInfo}
            />
        </div>
    </div>
  );
}
