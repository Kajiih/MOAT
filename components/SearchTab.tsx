'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { Filter, Info } from 'lucide-react';
import { MediaType, PRIMARY_TYPES, SECONDARY_TYPES, SortOption, MediaItem } from '@/lib/types';
import { useMediaSearch, usePersistentState, useSearchFilters } from '@/lib/hooks';
import { useToast } from '@/components/ToastProvider';
import { MediaCard } from '@/components/MediaCard';
import { ArtistPicker } from '@/components/ArtistPicker';
import { AlbumPicker } from '@/components/AlbumPicker';
import { SkeletonCard } from '@/components/SkeletonCard';
import { SortDropdown } from '@/components/SortDropdown';
import { Pagination } from '@/components/Pagination';
import { FilterButton } from '@/components/FilterButton';

interface SearchTabProps {
  type: MediaType;
  addedItemIds: Set<string>;
  onLocate: (id: string) => void;
  isHidden: boolean;
  showAdded: boolean;
  globalFuzzy: boolean;
  globalWildcard: boolean;
  onInfo: (item: MediaItem) => void;
}

const ARTIST_TYPES = ['Person', 'Group', 'Orchestra', 'Choir', 'Character', 'Other'];
const ARTIST_GENDERS = ['Male', 'Female', 'Other', 'Not applicable'];

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
    globalWildcard,
    onInfo
}: SearchTabProps) {
  const { showFilters, toggleFilters } = useSearchFilters(type);
  const [sortOption, setSortOption] = usePersistentState<SortOption>(`moat-search-ui-${type}-sortOption`, 'relevance');

  const {
    query, setQuery,
    minYear, setMinYear,
    maxYear, setMaxYear,
    albumPrimaryTypes, setAlbumPrimaryTypes,
    albumSecondaryTypes, setAlbumSecondaryTypes,
    artistType, setArtistType,
    artistGender, setArtistGender,
    artistCountry, setArtistCountry,
    tag, setTag,
    videoOnly, setVideoOnly,
    page, setPage,
    selectedArtist,
    setSelectedArtist,
    selectedAlbum,
    setSelectedAlbum,
    results: searchResults,
    totalPages,
    error,
    isLoading: isSearching,
    searchNow
  } = useMediaSearch(type, {
      fuzzy: globalFuzzy,
      wildcard: globalWildcard,
      enabled: !isHidden
  });

  const { showToast } = useToast();

  // Handle errors (specifically rate limits)
  useEffect(() => {
    if (error?.status === 503) {
      showToast('MusicBrainz is busy. The data will be updated soon.', 'error');
    }
  }, [error, showToast]);

  const sortedResults = useMemo(() => {
    return [...searchResults].sort((a, b) => {
        switch (sortOption) {
          case 'date_desc':
            return (b.date || b.year || '').localeCompare(a.date || a.year || '');
          case 'date_asc':
            return (a.date || a.year || '9999').localeCompare(b.date || b.year || '9999');
          case 'title_asc':
            return a.title.localeCompare(b.title);
          case 'title_desc':
            return b.title.localeCompare(a.title);
          case 'duration_desc':
             // @ts-ignore - duration check
             return (b.duration || 0) - (a.duration || 0);
          case 'duration_asc':
             // @ts-ignore - duration check
             return (a.duration || 0) - (b.duration || 0);
          default:
            return 0;
        }
      });
  }, [searchResults, sortOption]);

  const togglePrimaryType = useCallback((t: string) => {
      const newTypes = albumPrimaryTypes.includes(t) 
        ? albumPrimaryTypes.filter(x => x !== t) 
        : [...albumPrimaryTypes, t];
      setAlbumPrimaryTypes(newTypes);
  }, [albumPrimaryTypes, setAlbumPrimaryTypes]);

  const toggleSecondaryType = useCallback((t: string) => {
      const newTypes = albumSecondaryTypes.includes(t) 
        ? albumSecondaryTypes.filter(x => x !== t) 
        : [...albumSecondaryTypes, t];
      setAlbumSecondaryTypes(newTypes);
  }, [albumSecondaryTypes, setAlbumSecondaryTypes]);

  if (isHidden) {
    return null;
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
                
                <SortDropdown sortOption={sortOption} onSortChange={setSortOption} type={type} />

                <button
                    onClick={toggleFilters}
                    className={`p-2 rounded border transition-colors ${showFilters ? 'bg-red-900/20 border-red-900/50 text-red-400' : 'bg-black border-neutral-700 text-neutral-400 hover:text-white'}`}
                    title="Toggle Filters"
                >
                    <Filter size={18} />
                </button>
            </div>
            
            {/* Context Filters (Artist Picker) */}
            {type !== 'artist' && (
                <div className="grid grid-cols-1 gap-2">
                    <ArtistPicker
                        selectedArtist={selectedArtist}
                        onSelect={(a) => {
                            setSelectedArtist(a);
                            // If artist changes, reset selected album
                            if (type === 'song') setSelectedAlbum(null);
                        }}
                        fuzzy={globalFuzzy}
                        wildcard={globalWildcard}
                    />

                    {type === 'song' && (
                        <AlbumPicker
                            selectedAlbum={selectedAlbum}
                            onSelect={setSelectedAlbum}
                            fuzzy={globalFuzzy}
                            wildcard={globalWildcard}
                            artistId={selectedArtist?.id}
                        />
                    )}
                </div>
            )}
            
            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="bg-neutral-900/50 p-2 rounded border border-neutral-800 space-y-3">
                    
                    {/* Album Specific Filters */}
                    {type === 'album' && (
                        <>
                            <div>
                                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1.5 flex justify-between">
                                    <span>Primary Types</span>
                                    {!(albumPrimaryTypes.length === 2 && albumPrimaryTypes.includes('Album') && albumPrimaryTypes.includes('EP')) && (
                                        <button onClick={() => setAlbumPrimaryTypes(['Album', 'EP'])} className="text-red-400 hover:text-red-300">Reset</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {PRIMARY_TYPES.map(t => (
                                        <FilterButton 
                                            key={t}
                                            label={t}
                                            isSelected={albumPrimaryTypes.includes(t)}
                                            onClick={() => togglePrimaryType(t)}
                                            variant="primary"
                                        />
                                    ))}
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
                                    {SECONDARY_TYPES.map(t => (
                                        <FilterButton 
                                            key={t}
                                            label={t}
                                            isSelected={albumSecondaryTypes.includes(t)}
                                            onClick={() => toggleSecondaryType(t)}
                                            variant="secondary"
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Artist Specific Filters */}
                    {type === 'artist' && (
                        <>
                             <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Type</label>
                                    <select 
                                        value={artistType} 
                                        onChange={(e) => setArtistType(e.target.value)}
                                        className="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-600"
                                    >
                                        <option value="">Any Type</option>
                                        {ARTIST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Gender</label>
                                    <select 
                                        value={artistGender} 
                                        onChange={(e) => setArtistGender(e.target.value)}
                                        className="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-600"
                                    >
                                        <option value="">Any Gender</option>
                                        {ARTIST_GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Country</label>
                                <input
                                    placeholder="e.g. Germany, US, JP..."
                                    className="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-600"
                                    value={artistCountry}
                                    onChange={e => setArtistCountry(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {/* Common Filters (Date, Tag) */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                             <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">
                                {type === 'artist' ? 'Est. From' : 'From Year'}
                             </label>
                             <input
                                placeholder="Year..."
                                type="number"
                                className="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-600"
                                value={minYear}
                                onChange={e => setMinYear(e.target.value)}
                            />
                        </div>
                        <div>
                             <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">
                                {type === 'artist' ? 'Est. To' : 'To Year'}
                             </label>
                             <input
                                placeholder="Year..."
                                type="number"
                                className="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-600"
                                value={maxYear}
                                onChange={e => setMaxYear(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Tag / Genre</label>
                        <input
                            placeholder="e.g. rock, jazz, 80s..."
                            className="w-full bg-black border border-neutral-700 rounded px-2 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-600"
                            value={tag}
                            onChange={e => setTag(e.target.value)}
                        />
                    </div>
                    
                    {/* Song Specific Filters */}
                    {type === 'song' && (
                        <div className="flex items-center gap-2 pt-1">
                            <input 
                                type="checkbox" 
                                id="videoOnly"
                                checked={videoOnly}
                                onChange={(e) => setVideoOnly(e.target.checked)}
                                className="accent-red-600"
                            />
                            <label htmlFor="videoOnly" className="text-xs text-neutral-300 cursor-pointer select-none">
                                Has Video (Music Video)
                            </label>
                        </div>
                    )}
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
                                key={`${item.id}-${isAdded}`}
                                item={item}
                                id={`search-${item.id}`}
                                isAdded={isAdded}
                                onLocate={onLocate}
                                priority={index < 10}
                                onInfo={onInfo}
                            />
                        );
                    })}
                </div>
            )}
            
            {!isSearching && searchResults.length === 0 && (
                query || selectedArtist || selectedAlbum || minYear || maxYear || 
                albumPrimaryTypes.length > 0 || albumSecondaryTypes.length > 0 ||
                artistType || artistGender || artistCountry || tag || videoOnly
            ) && (
                <div className="text-center text-neutral-600 italic mt-8 text-sm">No results found.</div>
            )}

            {!isSearching && searchResults.length > 0 && totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <Pagination 
                        page={page} 
                        totalPages={totalPages} 
                        onPageChange={setPage} 
                    />
                </div>
            )}
        </div>
    </div>
  );
}
