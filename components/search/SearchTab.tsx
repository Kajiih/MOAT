/**
 * @file SearchTab.tsx
 * @description A self-contained component for a specific media search type (Album, Artist, or Song).
 * Manages its own local state for queries, filters, and pagination, preserving it even when hidden.
 * Orchestrates the search UI: input, filters, results grid, and pagination.
 * @module SearchTab
 */

'use client';

import { Filter } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { MediaCard } from '@/components/media/MediaCard';
import { useTierListContext } from '@/components/providers/TierListContext';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SortDropdown } from '@/components/ui/SortDropdown';
import { useToast } from '@/components/ui/ToastProvider';
import { getMediaService } from '@/lib/services/factory';
import { BaseMediaItem, MediaItem, MediaType, SongItem, SortOption } from '@/lib/types';

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
  const { state: { category } } = useTierListContext();
  const service = useMemo(() => getMediaService(category || 'music'), [category]);
  const { showFilters, toggleFilters } = useSearchFilters(type);
  
  // Logic: Enable prefetch by default, disable ONLY when interacting with filters/input
  const [shouldPrefetch, setShouldPrefetch] = useState(true);

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
    prefetchEnabled: shouldPrefetch,
  });

  const { showToast } = useToast();

  // Handle errors
  useEffect(() => {
    // 503 from MusicBrainz (we can make this generic later if needed)
    if (error?.status === 503) {
      showToast('Search service is busy. Please try again in a moment.', 'error');
    }
  }, [error, showToast]);

  const sortedResults = useMemo(() => {
    const sortOption = (filters.sort as SortOption) || 'relevance';
    return searchResults.toSorted((a: MediaItem, b: MediaItem) => {
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
           return ((b as SongItem).duration || 0) - ((a as SongItem).duration || 0);
        }
        case 'duration_asc': {
           return ((a as SongItem).duration || 0) - ((b as SongItem).duration || 0);
        }
        case 'rating_desc': {
           const aVal = (a as BaseMediaItem).rating ?? -1;
           const bVal = (b as BaseMediaItem).rating ?? -1;
           return bVal - aVal;
        }
        case 'rating_asc': {
           const aVal = (a as BaseMediaItem).rating ?? 999;
           const bVal = (b as BaseMediaItem).rating ?? 999;
           return aVal - bVal;
        }
        case 'reviews_desc': {
           const aVal = (a as BaseMediaItem).reviewCount ?? -1;
           const bVal = (b as BaseMediaItem).reviewCount ?? -1;
           return bVal - aVal;
        }
        case 'reviews_asc': {
           const aVal = (a as BaseMediaItem).reviewCount ?? 999_999_999;
           const bVal = (b as BaseMediaItem).reviewCount ?? 999_999_999;
           return aVal - bVal;
        }
        default: {
          return 0;
        }
      }
    });
  }, [searchResults, filters.sort]);

  const finalResults = useMemo(() => {
    if (showAdded) return sortedResults;
    return sortedResults.filter((item: MediaItem) => !addedItemIds.has(item.id));
  }, [sortedResults, showAdded, addedItemIds]);

  // Check if any filter is active to show results or "No results found"
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'page') return false;
      if (!value) return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });
  }, [filters]);

  if (isHidden) {
    return null;
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
      <div 
        className="mb-4 grid shrink-0 grid-cols-1 gap-2"
        onMouseEnter={() => setShouldPrefetch(false)}
        onMouseLeave={() => setShouldPrefetch(true)}
        onFocus={() => setShouldPrefetch(false)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
             setShouldPrefetch(true);
          }
        }}
      >
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

          <SortDropdown
            sortOption={(filters.sort as string) || 'relevance'}
            onSortChange={(val) => updateFilters({ sort: val })}
            type={type}
            options={service.getFilters(type).find((f) => f.id === 'sort')?.options}
          />

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
            />
          </div>
        )}
      </div>

      {/* Results Area (Grid + Pagination) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{renderContent()}</div>

        {/* Pagination Footer - Fixed at bottom */}
        {!isSearching && searchResults.length > 0 && totalPages > 1 && (
          <div className="mt-2 flex shrink-0 items-center justify-center gap-4 border-t border-neutral-800 pt-2">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
