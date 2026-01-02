'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaType } from '@/lib/types';
import { useMediaSearch } from '@/lib/hooks';
import { MediaCard } from '@/components/MediaCard';
import { ArtistPicker } from '@/components/ArtistPicker';

interface SearchTabProps {
  type: MediaType;
  addedItemIds: Set<string>;
  onLocate: (id: string) => void;
  isHidden: boolean;
  showAdded: boolean;
}

/**
 * A self-contained tab content for a specific search type.
 * Preserves its own search state (query, page, filters) even when hidden.
 */
export function SearchTab({ type, addedItemIds, onLocate, isHidden, showAdded }: SearchTabProps) {
  const [selectedArtist, setSelectedArtist] = useState<{id: string; name: string; imageUrl?: string} | null>(null);

  const { 
    query, setQuery,
    minYear, setMinYear,
    maxYear, setMaxYear,
    page, setPage,
    setArtistId,
    results: searchResults,
    totalPages,
    isLoading: isSearching
  } = useMediaSearch(type);

  if (isHidden) {
    return <div className="hidden" />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-1 gap-2 mb-4 shrink-0">
            <input 
                placeholder={`Search ${type}s...`} 
                className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm w-full"
                value={query}
                onChange={e => setQuery(e.target.value)}
            />
            
            {type !== 'artist' && (
                 <div className="grid grid-cols-1 gap-2">
                    <ArtistPicker 
                        selectedArtist={selectedArtist}
                        onSelect={(artist) => {
                          setSelectedArtist(artist);
                          setArtistId(artist?.id);
                        }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input 
                            placeholder="From Year..." 
                            type="number"
                            className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                            value={minYear}
                            onChange={e => setMinYear(e.target.value)}
                        />
                        <input 
                            placeholder="To Year..." 
                            type="number"
                            className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                            value={maxYear}
                            onChange={e => setMaxYear(e.target.value)}
                        />
                    </div>
                </div>
            )}
            
            {type === 'artist' && (
                 <div className="grid grid-cols-2 gap-2">
                    <input 
                        placeholder="Est. From..." 
                        type="number"
                        className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                        value={minYear}
                        onChange={e => setMinYear(e.target.value)}
                    />
                    <input 
                        placeholder="Est. To..." 
                        type="number"
                        className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                        value={maxYear}
                        onChange={e => setMaxYear(e.target.value)}
                    />
                </div>
            )}
        </div>

        <div className="overflow-y-auto min-h-[200px] flex-1 pr-1 custom-scrollbar">
            {isSearching && <div className="text-xs text-neutral-500 animate-pulse mb-2">Querying API...</div>}
            
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3">
                {searchResults.map((item, index) => {
                    const isAdded = addedItemIds.has(item.id);
                    if (!showAdded && isAdded) return null;

                    return (
                        <MediaCard 
                            key={item.id} 
                            item={item}
                            id={`search-${item.id}`} 
                            isAdded={isAdded}
                            onLocate={onLocate}
                            priority={index < 10}
                        />
                    );
                })}
            </div>
            
            {!isSearching && searchResults.length === 0 && (query || selectedArtist || minYear || maxYear) && (
                <div className="text-center text-neutral-600 italic mt-8 text-sm">No results found.</div>
            )}

            {!isSearching && searchResults.length > 0 && totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button 
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-1 rounded bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-neutral-400">Page {page} of {totalPages}</span>
                    <button 
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="p-1 rounded bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}
