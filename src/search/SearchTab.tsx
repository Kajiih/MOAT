/**
 * @file SearchTab.tsx
 * @description A self-contained tab content for a specific V2 search entity.
 */

'use client';

import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { ItemCard } from '@/items/ItemCard';
import { Item } from '@/items/schemas';
import { SkeletonCard } from '@/items/SkeletonCard';
import { registry } from '@/providers/registry';
import { isSortReversible, SortDirection, SearchParams } from '@/search/schemas';
import { SortDropdown } from '@/search/SortDropdown';
import { useItemSearch } from '@/search/useItemSearch';

import { FilterPanel } from './FilterPanel';

interface SearchTabProps {
  providerId: string;
  entityId: string;
  addedItemIds: Set<string>;
  onLocate: (id: string) => void;
  isHidden: boolean;
  showAdded: boolean;
  onInfo: (item: Item) => void;
}

/**
 * SearchTab component for a specific entity.
 */
export function SearchTab({
  providerId,
  entityId,
  addedItemIds,
  onLocate,
  isHidden,
  showAdded,
  onInfo,
}: SearchTabProps) {
  const entity = useMemo(() => registry.getEntity(providerId, entityId), [providerId, entityId]);
  
  // Use a unified params state initialized by the entity
  // We use PaginationStrategy union here because we don't know the specific one until the entity is resolved.
  const [params, setParams] = useState<SearchParams>(() => 
    entity?.getInitialParams({ limit: 20 }) || { query: '', filters: {}, limit: 20 }
  );
  
  const [showFilters, setShowFilters] = useState(false);

  const {
    results,
    pagination,
    isLoading,
    error,
  } = useItemSearch(providerId, entityId, params, {
    enabled: !isHidden,
  });

  const finalResults = useMemo(() => {
    if (showAdded) return results;
    return (results as Item[]).filter((item: Item) => !addedItemIds.has(item.id));
  }, [results, showAdded, addedItemIds]);

  if (isHidden) return null;

  const renderContent = () => {
    if (isLoading) {
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
                <ItemCard
                  key={`${item.id}-${isAdded}`}
                  item={item as Item}
                  isAdded={isAdded}
                  onLocate={() => onLocate(item.id)}
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
        {(params.query || Object.keys(params.filters).length > 0) && (
          <div className="mt-8 text-center text-sm text-neutral-600 italic">No results found.</div>
        )}
      </div>
    );
  };

  const handleSortChange = (newSort: string) => {
    const option = entity?.sortOptions.find((opt) => opt.id === newSort);
    setParams(prev => ({
      ...prev,
      sort: newSort,
      sortDirection: option?.defaultDirection || SortDirection.ASC,
      // Reset pagination when sort changes
      ...(entity ? entity.getInitialParams({ limit: prev.limit }) : {})
    }));
  }

  const toggleSortDirection = () => {
    const newDir = params.sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC;
    setParams(prev => ({
      ...prev,
      sortDirection: newDir,
      // Reset pagination when direction changes
      ...(entity ? entity.getInitialParams({ limit: prev.limit }) : {})
    }));
  }

  const currentSortOption = entity?.sortOptions.find(opt => opt.id === params.sort);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 grid shrink-0 grid-cols-1 gap-2">
        <div className="flex gap-2">
          <input
            placeholder={`Search ${entity?.branding.labelPlural}...`}
            className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-sm outline-none focus:border-red-600"
            value={params.query}
            onChange={(e) => {
              const query = e.target.value;
              setParams(prev => ({
                ...prev,
                // Reset pagination on new search
                ...(entity ? entity.getInitialParams({ limit: prev.limit }) : {}),
                query,
              }));
            }}
          />

          {entity && entity.sortOptions.length > 0 && (
            <div className="flex shrink-0 gap-1 rounded border border-neutral-700 bg-black p-1">
              <SortDropdown
                sortOption={params.sort || ''}
                onSortChange={handleSortChange}
                options={entity.sortOptions.map((opt) => ({
                  label: opt.label,
                  value: opt.id,
                  defaultDirection: opt.defaultDirection,
                }))}
              />
              {currentSortOption && isSortReversible(currentSortOption) && (
                <button
                  onClick={toggleSortDirection}
                  className="flex h-8 w-8 items-center justify-center rounded bg-neutral-800 text-neutral-400 transition-colors hover:text-white"
                  title={`Sort ${params.sortDirection === SortDirection.ASC ? 'Ascending' : 'Descending'} (Click to reverse)`}
                >
                  {params.sortDirection === SortDirection.ASC ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                  )}
                </button>
              )}
            </div>
          )}

          {entity && (entity.filters.length > 0 || entity.searchOptions.length > 0) && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded border p-2 transition-colors ${showFilters ? 'border-red-900/50 bg-red-900/20 text-red-400' : 'border-neutral-700 bg-black text-neutral-400 hover:text-white'}`}
              title="Toggle Filters"
            >
              <Filter size={18} />
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && entity && (
          <div className="rounded border border-neutral-800 bg-neutral-900/50 p-2">
            <FilterPanel
              entity={entity}
              values={params.filters}
              onChange={(newFilters) => {
                setParams(prev => ({
                  ...prev,
                  // Reset pagination on filter change
                  ...(entity ? entity.getInitialParams({ limit: prev.limit }) : {}),
                  filters: newFilters,
                }));
              }}
            />
          </div>
        )}
      </div>

      {/* Results Area (Grid + Pagination) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error && (
          <div className="mb-4 rounded bg-red-900/20 p-3 text-sm text-red-400 border border-red-900/50">
            {error.message}
          </div>
        )}
        
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {renderContent()}
        </div>

        {/* Pagination Footer */}
        {!isLoading && results.length > 0 && pagination && (
          <div className="mt-2 flex shrink-0 items-center justify-center gap-4 border-t border-neutral-800 pb-2 pt-2">
            <button
              disabled={!entity?.getPreviousParams(params, { items: results, pagination, raw: [] })}
              onClick={() => {
                const prev = entity?.getPreviousParams(params, { items: results, pagination, raw: [] });
                if (prev) setParams(prev);
              }}
              className="rounded bg-neutral-800 p-1 transition-colors hover:bg-neutral-700 disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {'totalPages' in pagination && (
              <span className="text-xs text-neutral-400">
                Page {'page' in params ? params.page : 1} of {pagination.totalPages}
              </span>
            )}

            <button
              disabled={!entity?.getNextParams(params, { items: results, pagination, raw: [] })}
              onClick={() => {
                const next = entity?.getNextParams(params, { items: results, pagination, raw: [] });
                if (next) setParams(next);
              }}
              className="rounded bg-neutral-800 p-1 transition-colors hover:bg-neutral-700 disabled:opacity-30"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
