'use client';

import { useMemo, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { MediaType, SortOption, MediaItem } from '@/lib/types';
import { useMediaSearch, usePersistentState, useSearchFilters } from '@/lib/hooks';
import { useToast } from '@/components/ToastProvider';
import { MediaCard } from '@/components/MediaCard';
import { ArtistPicker } from '@/components/ArtistPicker';
import { AlbumPicker } from '@/components/AlbumPicker';
import { SkeletonCard } from '@/components/SkeletonCard';
import { SortDropdown } from '@/components/SortDropdown';
import { Pagination } from '@/components/Pagination';
import { SearchFilters } from './filters/SearchFilters';

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
    artistCountry, setArtistCountry,
    tag, setTag,
    minDuration, setMinDuration,
    maxDuration, setMaxDuration,
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
             // @ts-expect-error - duration check
             return (b.duration || 0) - (a.duration || 0);
          case 'duration_asc':
             // @ts-expect-error - duration check
             return (a.duration || 0) - (b.duration || 0);
          default:
            return 0;
        }
      });
  }, [searchResults, sortOption]);

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
            
            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="bg-neutral-900/50 p-2 rounded border border-neutral-800">
                    <SearchFilters 
                        type={type}
                        state={{
                            minYear, setMinYear,
                            maxYear, setMaxYear,
                            tag, setTag,
                            artistType, setArtistType,
                            artistCountry, setArtistCountry,
                            albumPrimaryTypes, setAlbumPrimaryTypes,
                            albumSecondaryTypes, setAlbumSecondaryTypes,
                            minDuration, setMinDuration,
                            maxDuration, setMaxDuration
                        }}
                        contextPickers={type !== 'artist' ? (
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
                                    context={type}
                                />

                                {type === 'song' && (
                                    <AlbumPicker
                                        selectedAlbum={selectedAlbum}
                                        onSelect={setSelectedAlbum}
                                        fuzzy={globalFuzzy}
                                        wildcard={globalWildcard}
                                        artistId={selectedArtist?.id}
                                        context="song-filter"
                                    />
                                )}
                            </div>
                        ) : undefined}
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
                artistType || artistCountry || tag || minDuration || maxDuration
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