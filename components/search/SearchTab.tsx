/**
 * @file SearchTab.tsx
 * @description A self-contained component for a specific media search type (Album, Artist, or Song).
 * Manages its own local state for queries, filters, and pagination, preserving it even when hidden.
 * Orchestrates the search UI: input, filters, results grid, and pagination.
 * @module SearchTab
 */

'use client';

import { Filter } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { AlbumPicker } from '@/components/media/AlbumPicker';
import { ArtistPicker } from '@/components/media/ArtistPicker';
import { MediaCard } from '@/components/media/MediaCard';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SortDropdown } from '@/components/ui/SortDropdown';
import { useToast } from '@/components/ui/ToastProvider';
import { useMediaSearch, usePersistentState, useSearchFilters } from '@/lib/hooks';
import { MediaItem, MediaType, SortOption } from '@/lib/types';

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
  onInfo,
}: SearchTabProps) {
  const { showFilters, toggleFilters } = useSearchFilters(type);
  const [sortOption, setSortOption] = usePersistentState<SortOption>(
    `moat-search-ui-${type}-sortOption`,
    'relevance',
  );

  const {
    filters,
    updateFilters,
    page,
    setPage,
    results: searchResults,
    totalPages,
    error,
    isLoading: isSearching,
    searchNow,
  } = useMediaSearch(type, {
    fuzzy: globalFuzzy,
    wildcard: globalWildcard,
    enabled: !isHidden,
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
        case 'date_desc': {
          return (b.date || b.year || '').localeCompare(a.date || a.year || '');
        }
        case 'date_asc': {
          return (a.date || a.year || '9999').localeCompare(b.date || b.year || '9999');
        }
        case 'title_asc': {
          return a.title.localeCompare(b.title);
        }
        case 'title_desc': {
          return b.title.localeCompare(a.title);
        }
        case 'duration_desc': {
          // @ts-expect-error - duration check
          return (b.duration || 0) - (a.duration || 0);
        }
        case 'duration_asc': {
          // @ts-expect-error - duration check
          return (a.duration || 0) - (b.duration || 0);
        }
        default: {
          return 0;
        }
      }
    });
  }, [searchResults, sortOption]);

  const finalResults = useMemo(() => {
    if (showAdded) return sortedResults;
    return sortedResults.filter((item) => !addedItemIds.has(item.id));
  }, [sortedResults, showAdded, addedItemIds]);

  if (isHidden) {
    return null;
  }

  // Check if any filter is active
  const hasActiveFilters =
    filters.query ||
    filters.selectedArtist ||
    filters.selectedAlbum ||
    filters.minYear ||
    filters.maxYear ||
    filters.albumPrimaryTypes.length > 0 ||
    filters.albumSecondaryTypes.length > 0 ||
    filters.artistType ||
    filters.artistCountry ||
    filters.tag ||
    filters.minDuration ||
    filters.maxDuration;

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <div className="grid grid-cols-1 gap-2 mb-4 shrink-0">
        <div className="flex gap-2">
          <input
            placeholder={`Search ${type}s...`}
            className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm w-full"
            value={filters.query}
            onChange={(e) => updateFilters({ query: e.target.value })}
            onKeyDown={(e) => {
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
              filters={filters}
              updateFilters={updateFilters}
              contextPickers={
                type !== 'artist' ? (
                  <div className="grid grid-cols-1 gap-2">
                    <ArtistPicker
                      selectedArtist={filters.selectedArtist}
                      onSelect={(a) => {
                        updateFilters({
                          selectedArtist: a,
                          // If artist changes, reset selected album
                          selectedAlbum: type === 'song' ? null : filters.selectedAlbum,
                        });
                      }}
                      fuzzy={globalFuzzy}
                      wildcard={globalWildcard}
                      context={type}
                    />

                    {type === 'song' && (
                      <AlbumPicker
                        selectedAlbum={filters.selectedAlbum}
                        onSelect={(a) => updateFilters({ selectedAlbum: a })}
                        fuzzy={globalFuzzy}
                        wildcard={globalWildcard}
                        artistId={filters.selectedArtist?.id}
                        context="song-filter"
                      />
                    )}
                  </div>
                ) : undefined
              }
            />
          </div>
        )}
      </div>

      {/* Content Area: Grid or Loading State */}
      <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
        {isSearching ? (
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
              {Array.from({ length: 15 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        ) : finalResults.length > 0 ? (
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
              {finalResults.map((item) => {
                const isAdded = addedItemIds.has(item.id);
                return (
                  <MediaCard
                    key={`${item.id}-${isAdded}`}
                    item={item}
                    id={`search-${item.id}`}
                    isAdded={isAdded}
                    onLocate={onLocate}
                    onInfo={onInfo}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {hasActiveFilters && (
              <div className="text-center text-neutral-600 italic mt-8 text-sm">
                No results found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination Footer - Fixed at bottom */}
      {!isSearching && searchResults.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-2 pt-2 border-t border-neutral-800 shrink-0">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
