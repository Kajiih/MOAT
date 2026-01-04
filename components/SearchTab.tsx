'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { MediaType, ArtistSelection, PRIMARY_TYPES, SECONDARY_TYPES } from '@/lib/types';
import { useMediaSearch } from '@/lib/hooks';
import { MediaCard } from '@/components/MediaCard';
import { ArtistPicker } from '@/components/ArtistPicker';
import { SkeletonCard } from '@/components/SkeletonCard';

interface SearchTabProps {
  type: MediaType;
  addedItemIds: Set<string>;
  onLocate: (id: string) => void;
  isHidden: boolean;
  showAdded: boolean;
  globalFuzzy: boolean;
  globalWildcard: boolean;
}

/**
 * A self-contained tab content for a specific search type.
 * Preserves its own search state (query, page, filters) even when hidden.
 */
export function SearchTab({
    type,
    addedItemIds,
    onLocate,
    isHidden,
    showAdded,
    globalFuzzy,
    globalWildcard
}: SearchTabProps) {
  const [selectedArtist, setSelectedArtist] = useState<ArtistSelection | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    query, setQuery,
    minYear, setMinYear,
    maxYear, setMaxYear,
    albumPrimaryTypes, setAlbumPrimaryTypes,
    albumSecondaryTypes, setAlbumSecondaryTypes,
    page, setPage,
    setArtistId,
    results: searchResults,
    totalPages,
    isLoading: isSearching,
    searchNow
  } = useMediaSearch(type, {
      fuzzy: globalFuzzy,
      wildcard: globalWildcard,
      enabled: !isHidden
  });

  const togglePrimaryType = (t: string) => {
      if (albumPrimaryTypes.includes(t)) {
          setAlbumPrimaryTypes(albumPrimaryTypes.filter(x => x !== t));
      } else {
          setAlbumPrimaryTypes([...albumPrimaryTypes, t]);
      }
  };

  const toggleSecondaryType = (t: string) => {
      if (albumSecondaryTypes.includes(t)) {
          setAlbumSecondaryTypes(albumSecondaryTypes.filter(x => x !== t));
      } else {
          setAlbumSecondaryTypes([...albumSecondaryTypes, t]);
      }
  };

  if (isHidden) {
    return <div className="hidden" />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
        <div className="grid grid-cols-1 gap-2 mb-4 shrink-0">
            <div className="flex gap-2">
                <input
                    placeholder={`Search ${type}s...`}
                    className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm w-full"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        searchNow();
                      }
                    }}
                />
                {type === 'album' && (
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded border transition-colors ${showFilters ? 'bg-red-900/20 border-red-900/50 text-red-400' : 'bg-black border-neutral-700 text-neutral-400 hover:text-white'}`}
                        title="Toggle Filters"
                    >
                        <Filter size={18} />
                    </button>
                )}
            </div>
            
            {type !== 'artist' && (
                 <div className="grid grid-cols-1 gap-2">
                    <ArtistPicker
                        selectedArtist={selectedArtist}
                        onSelect={(artist) => {
                          setSelectedArtist(artist);
                          setArtistId(artist?.id);
                        }}
                        fuzzy={globalFuzzy}
                        wildcard={globalWildcard}
                    />
                    
                    {type === 'album' && showFilters && (
                        <div className="bg-neutral-900/50 p-2 rounded border border-neutral-800 space-y-3">
                            <div>
                                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1.5 flex justify-between">
                                    <span>Primary Types</span>
                                    {albumPrimaryTypes.length > 0 && (
                                        <button onClick={() => setAlbumPrimaryTypes([])} className="text-red-400 hover:text-red-300">Clear</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {PRIMARY_TYPES.map(t => {
                                        const isSelected = albumPrimaryTypes.includes(t);
                                        return (
                                            <button
                                                key={t}
                                                onClick={() => togglePrimaryType(t)}
                                                className={`px-2 py-1 rounded text-[10px] border transition-all ${
                                                    isSelected
                                                        ? 'bg-red-600 border-red-500 text-white font-medium'
                                                        : 'bg-black border-neutral-700 text-neutral-400 hover:border-neutral-500'
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1.5 flex justify-between">
                                    <span>Include Extra</span>
                                    {albumSecondaryTypes.length > 0 && (
                                        <button onClick={() => setAlbumSecondaryTypes([])} className="text-blue-400 hover:text-blue-300">Clear</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {SECONDARY_TYPES.map(t => {
                                        const isSelected = albumSecondaryTypes.includes(t);
                                        return (
                                            <button
                                                key={t}
                                                onClick={() => toggleSecondaryType(t)}
                                                className={`px-2 py-1 rounded text-[10px] border transition-all ${
                                                    isSelected
                                                        ? 'bg-blue-600 border-blue-500 text-white font-medium'
                                                        : 'bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300'
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            placeholder="From Year..."
                            type="number"
                            className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-xs"
                            value={minYear}
                            onChange={e => setMinYear(e.target.value)}
                        />
                        <input
                            placeholder="To Year..."
                            type="number"
                            className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-xs"
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
                        className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-xs"
                        value={minYear}
                        onChange={e => setMinYear(e.target.value)}
                    />
                    <input
                        placeholder="Est. To..."
                        type="number"
                        className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-xs"
                        value={maxYear}
                        onChange={e => setMaxYear(e.target.value)}
                    />
                </div>
            )}
        </div>

        <div className="overflow-y-auto min-h-[200px] flex-1 pr-1 custom-scrollbar">
            {isSearching ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : (
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
            )}
            
            {!isSearching && searchResults.length === 0 && (query || selectedArtist || minYear || maxYear || albumPrimaryTypes.length > 0 || albumSecondaryTypes.length > 0) && (
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
