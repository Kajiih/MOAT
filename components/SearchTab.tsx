'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, Info, ArrowUpDown } from 'lucide-react';
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

  type SortOption = 'relevance' | 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc';
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [showSort, setShowSort] = useState(false);

  const sortedResults = [...searchResults].sort((a, b) => {
    switch (sortOption) {
      case 'date_desc':
        return (b.date || b.year || '').localeCompare(a.date || a.year || '');
      case 'date_asc':
        return (a.date || a.year || '9999').localeCompare(b.date || b.year || '9999');
      case 'title_asc':
        return a.title.localeCompare(b.title);
      case 'title_desc':
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
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
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
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
                
                <div className="relative">
                    <button 
                        onClick={() => setShowSort(!showSort)}
                        className={`p-2 rounded border transition-colors ${showSort ? 'bg-neutral-800 border-neutral-600 text-white' : 'bg-black border-neutral-700 text-neutral-400 hover:text-white'}`}
                        title="Sort Results"
                    >
                        <ArrowUpDown size={18} />
                    </button>
                    {showSort && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col p-1">
                                                        {([                                { id: 'relevance', label: 'Relevance' },                                { id: 'date_desc', label: 'Date (Newest)' },                                { id: 'date_asc', label: 'Date (Oldest)' },                                { id: 'title_asc', label: 'Name (A-Z)' },                                { id: 'title_desc', label: 'Name (Z-A)' },                            ] as const).map((opt) => (                                <button                                    key={opt.id}                                    onClick={() => {                                        setSortOption(opt.id);                                        setShowSort(false);                                    }}                                    className={`text-left px-3 py-2 text-xs rounded hover:bg-neutral-800 transition-colors ${sortOption === opt.id ? 'text-white font-bold bg-neutral-800' : 'text-neutral-400'}`}                                >                                    {opt.label}                                </button>                            ))}
                        </div>
                    )}
                </div>
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
                                    {!(albumPrimaryTypes.length === 2 && albumPrimaryTypes.includes('Album') && albumPrimaryTypes.includes('EP')) && (
                                        <button onClick={() => setAlbumPrimaryTypes(['Album', 'EP'])} className="text-red-400 hover:text-red-300">Reset</button>
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
                                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1.5 flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                        <span>Secondary Types</span>
                                        <div className="group relative">
                                            <Info size={12} className="text-neutral-500 cursor-help hover:text-neutral-300 transition-colors" />
                                            <div className="absolute left-0 bottom-full mb-2 w-56 p-2 bg-neutral-900 border border-neutral-700 rounded shadow-xl text-[10px] text-neutral-300 normal-case font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                By default, standard albums are shown. Select types to exclusively filter for them (e.g. &apos;Live&apos; shows only Live albums).
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (albumSecondaryTypes.length === SECONDARY_TYPES.length) {
                                                setAlbumSecondaryTypes([]);
                                            } else {
                                                setAlbumSecondaryTypes([...SECONDARY_TYPES]);
                                            }
                                        }}
                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        {albumSecondaryTypes.length === SECONDARY_TYPES.length ? 'Deselect All' : 'Select All'}
                                    </button>
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

        <div className="overflow-y-auto min-h-0 flex-1 pr-1 custom-scrollbar">
            {isSearching ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3">
                    {sortedResults.map((item, index) => {
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
