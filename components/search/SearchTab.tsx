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
import { usePersistentState } from '@/lib/hooks';
import { MediaItem, MediaType, SortOption } from '@/lib/types';

import { SearchFilters } from './filters/SearchFilters';
import { useMediaSearch } from './hooks/useMediaSearch';
import { useSearchFilters } from './hooks/useSearchFilters';

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
 * @param props - The props for the component.
 * @param props.type - The type of media being searched.
 * @param props.addedItemIds - A set of IDs for items already on the board.
 * @param props.onLocate - Callback to locate an item on the board.
 * @param props.isHidden - Whether the tab is currently hidden.
 * @param props.showAdded - Whether to show items already on the board.
 * @param props.globalFuzzy - Global setting for fuzzy search.
 * @param props.globalWildcard - Global setting for wildcard search.
 * @param props.onInfo - Callback to show details for an item.
 * @returns The rendered SearchTab component, or null if hidden.
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
    return searchResults.toSorted((a, b) => {
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

  let contextPickers = null;
  if (type !== 'artist') {
    contextPickers = (
      <div className="grid grid-cols-1 gap-2">
        <ArtistPicker
          selectedArtist={filters.selectedArtist}
          onSelect={(a) => {
            const nextAlbum = type === 'song' ? null : filters.selectedAlbum;
            updateFilters({
              selectedArtist: a,
              // If artist changes, reset selected album
              selectedAlbum: nextAlbum,
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
    );
  }

  const renderContent = () => {
    if (isSearching) {
      return (
        <div className="custom-scrollbar flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
            {Array.from({ length: 15 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      );
    }

    if (finalResults.length > 0) {
      return (
        <div className="custom-scrollbar flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
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
      );
    }

    return (
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {hasActiveFilters && (
          <div className="mt-8 text-center text-sm text-neutral-600 italic">
            No results found.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 grid shrink-0 grid-cols-1 gap-2">
        <div className="flex gap-2">
          <input
            placeholder={`Search ${type}s...`}
            className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-sm outline-none focus:border-red-600"
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
            className={`rounded border p-2 transition-colors ${showFilters ? 'border-red-900/50 bg-red-900/20 text-red-400' : 'border-neutral-700 bg-black text-neutral-400 hover:text-white'}`}
            title="Toggle Filters"
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="rounded border border-neutral-800 bg-neutral-900/50 p-2">
            <SearchFilters
              type={type}
              filters={filters}
              updateFilters={updateFilters}
              contextPickers={contextPickers}
            />
          </div>
        )}
      </div>

      {/* Content Area: Grid or Loading State */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{renderContent()}</div>

      {/* Pagination Footer - Fixed at bottom */}
      {!isSearching && searchResults.length > 0 && totalPages > 1 && (
        <div className="mt-2 flex shrink-0 items-center justify-center gap-4 border-t border-neutral-800 pt-2">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
