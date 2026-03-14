/**
 * @file SearchTab.tsx
 * @description A self-contained tab content for a specific search entity.
 */

'use client';

import { ChevronLeft, ChevronRight,Filter } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { ItemCard } from '@/items/ItemCard';
import { Item } from '@/items/items';
import { SkeletonCard } from '@/items/SkeletonCard';
import { registry } from '@/providers/registry';
import { DEFAULT_PAGE_LIMIT } from '@/providers/types';
import { SearchParams } from '@/search/search-schemas';
import { isSortReversible, SortDirection } from '@/search/sort-schemas';
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
 * Search view interface bridging the FilterPanel, Results grid, and sorting configurations.
 * @param props - Component configuration settings.
 * @param props.providerId - ID of the active provider.
 * @param props.entityId - ID of the active entity within the provider.
 * @param props.addedItemIds - List to cross-reference existing items.
 * @param props.onLocate - Callback invoked when an item is located in a tier list.
 * @param props.isHidden - Boolean indicating if the tab is visually suppressed.
 * @param props.showAdded - Visual control variable.
 * @param props.onInfo - Trigger action for item detail modals.
 * @returns The rendered search tab.
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
    entity?.getInitialParams({ limit: DEFAULT_PAGE_LIMIT }) || { query: '', filters: {}, limit: DEFAULT_PAGE_LIMIT }
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
          <div role="listbox" aria-label="Search Results" className="flex flex-wrap justify-center gap-2">
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
          <div role="listbox" aria-label="Search Results" className="flex flex-wrap justify-center gap-2">
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
          <div className="mt-8 text-center text-sm text-muted italic">No results found.</div>
        )}
      </div>
    );
  };

  const resetPagination = (limit: number) => {
    if (!entity) return {};
    const { page, offset, cursor } = entity.getInitialParams({ limit });
    return { page, offset, cursor };
  };

  const handleSortChange = (newSort: string) => {
    const option = entity?.sortOptions.find((opt) => opt.id === newSort);
    setParams(prev => ({
      ...prev,
      sort: newSort,
      sortDirection: option?.defaultDirection || SortDirection.ASC,
      // Reset pagination when sort changes
      ...resetPagination(prev.limit),
    }));
  }

  const toggleSortDirection = () => {
    const newDir = params.sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC;
    setParams(prev => ({
      ...prev,
      sortDirection: newDir,
      // Reset pagination when direction changes
      ...resetPagination(prev.limit),
    }));
  }

  const currentSortOption = entity?.sortOptions.find(opt => opt.id === params.sort);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 grid shrink-0 grid-cols-1 gap-2">
        <div className="flex gap-2">
          <input
            placeholder={`Search ${entity?.branding.labelPlural}...`}
            className="w-full rounded-md border border-border bg-black px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={params.query}
            onChange={(e) => {
              const query = e.target.value;
              setParams(prev => ({
                ...prev,
                // Reset pagination on new search
                ...resetPagination(prev.limit),
                query,
              }));
            }}
          />

          {entity && entity.sortOptions.length > 0 && (
            <div className="flex shrink-0 gap-1 rounded-md border border-border bg-black p-1">
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
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-hover text-secondary transition-colors hover:text-foreground"
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
              className={`rounded-md border p-2 transition-colors ${showFilters ? 'border-destructive/50 bg-destructive/20 text-destructive' : 'border-border bg-black text-secondary hover:text-foreground'}`}
              title="Toggle Filters"
            >
              <Filter size={18} />
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && entity && (
          <div className="rounded-md border border-border bg-surface p-2">
            <FilterPanel
              entity={entity}
              values={params.filters}
              onChange={(newFilters) => {
                setParams(prev => ({
                  ...prev,
                  // Reset pagination on filter change
                  ...resetPagination(prev.limit),
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
          <div className="mb-4 rounded-md bg-destructive/20 p-3 text-sm text-destructive border border-destructive/50">
            {error.message}
          </div>
        )}
        
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {renderContent()}
        </div>

        {/* Pagination Footer */}
        {!isLoading && results.length > 0 && pagination && (
          <div className="mt-2 flex shrink-0 items-center justify-center gap-4 border-t border-border pb-2 pt-2">
            <button
              disabled={!entity?.getPreviousParams(params, { items: results, pagination, raw: [] })}
              onClick={() => {
                const prev = entity?.getPreviousParams(params, { items: results, pagination, raw: [] });
                if (prev) setParams(prev);
              }}
              className="rounded-md bg-surface-hover p-1 transition-colors hover:bg-surface disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {'totalPages' in pagination && (
              <span className="text-xs text-secondary">
                Page {'page' in params ? params.page : 1} of {pagination.totalPages}
              </span>
            )}

            <button
              disabled={!entity?.getNextParams(params, { items: results, pagination, raw: [] })}
              onClick={() => {
                const next = entity?.getNextParams(params, { items: results, pagination, raw: [] });
                if (next) setParams(next);
              }}
              className="rounded-md bg-surface-hover p-1 transition-colors hover:bg-surface disabled:opacity-30"
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
