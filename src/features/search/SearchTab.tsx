/**
 * @file SearchTab.tsx
 * @description A self-contained tab content for a specific search entity.
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Filter, Info } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  CARD_ANIMATION_HOVER,
  CARD_ANIMATION_TAP,
  CARD_ANIMATION_TRANSITION,
  CARD_ANIMATION_VARIANTS,
} from '@/core/ui/animations';
import { getColorTheme } from '@/core/utils/colors';
import { Item } from '@/domain/items/items';
import { DEFAULT_PAGE_LIMIT } from '@/domain/providers/types';
import { useTierListContext } from '@/features/board/context';
import { ItemCard } from '@/features/items/ItemCard';
import { SkeletonCard } from '@/features/items/SkeletonCard';
import { SearchParams } from '@/features/search/search-schemas';
import { isSortReversible, SortDirection } from '@/features/search/sort-schemas';
import { SortDropdown } from '@/features/search/SortDropdown';
import { useItemSearch } from '@/features/search/useItemSearch';
import { registry } from '@/infra/providers/registry';

import { FilterPanel } from './FilterPanel';
import { SearchEmptyState } from './SearchEmptyState';

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
  const { state } = useTierListContext();
  const entity = useMemo(() => registry.getEntity(providerId, entityId), [providerId, entityId]);

  const tierColors = useMemo(() => {
    return state.tierDefs.map((t) => getColorTheme(t.color).hex);
  }, [state.tierDefs]);

  // Use a unified params state initialized by the entity
  // We use PaginationStrategy union here because we don't know the specific one until the entity is resolved.
  const [params, setParams] = useState<SearchParams>(
    () =>
      entity?.getInitialParams({ limit: DEFAULT_PAGE_LIMIT }) || {
        query: '',
        filters: {},
        limit: DEFAULT_PAGE_LIMIT,
      },
  );

  const [showFilters, setShowFilters] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [params]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  const hasFilters = Object.keys(params.filters).length > 0;
  const isDiscoveryDisabled =
    entity?.capabilities?.supportsEmptyQueryBrowsing === false && !params.query && !hasFilters;

  const { results, pagination, isLoading, error } = useItemSearch(providerId, entityId, params, {
    enabled: !isHidden && !isDiscoveryDisabled,
  });

  const finalResults = useMemo(() => {
    if (showAdded) return results;
    return results.filter((item) => !addedItemIds.has(item.id));
  }, [results, showAdded, addedItemIds]);

  if (isHidden) return null;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="custom-scrollbar flex-1 overflow-y-auto pr-1">
          <div
            role="listbox"
            aria-label="Search Results"
            className="flex flex-wrap justify-center p-1"
          >
            {Array.from({ length: 15 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      );
    }

    if (finalResults.length > 0) {
      const isDiscoveryMode = !params.query && !hasFilters && finalResults.length > 0;
      const provider = registry.getProvider(providerId);

      return (
        <div
          ref={scrollContainerRef}
          data-testid="search-results-scroll-container"
          className="custom-scrollbar relative flex-1 overflow-y-auto pr-1"
        >
          {isDiscoveryMode && (
            <div className="absolute top-2 right-2 z-50">
              <div className="group relative inline-block">
                <div className="text-primary hover:text-primary/80 flex cursor-help items-center justify-center transition-colors">
                  <Info className="h-4 w-4" />
                </div>
                <div className="border-secondary/50 bg-secondary text-muted-foreground invisible absolute top-full right-0 z-50 mt-1 w-64 rounded-lg border p-3 text-xs shadow-lg group-hover:visible">
                  <div className="text-foreground mb-1 font-semibold">
                    Popular {entity?.branding.labelPlural} on {provider?.label}
                  </div>
                  Type or add filters to narrow down the results.
                </div>
              </div>
            </div>
          )}
          <div
            role="listbox"
            aria-label="Search Results"
            className="flex flex-wrap justify-center p-1"
          >
            <AnimatePresence>
              {finalResults.map((item) => {
                const isAdded = addedItemIds.has(item.id);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    variants={CARD_ANIMATION_VARIANTS}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    whileHover={CARD_ANIMATION_HOVER}
                    whileTap={CARD_ANIMATION_TAP}
                    transition={CARD_ANIMATION_TRANSITION}
                    className="inline-block"
                  >
                    <ItemCard
                      item={item}
                      isAdded={isAdded}
                      onLocate={() => onLocate(item.id)}
                      onInfo={onInfo}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      );
    }

    const hasActiveFilters = Boolean(params.query || Object.keys(params.filters).length > 0);

    return (
      <div className="custom-scrollbar flex-1 overflow-y-auto px-1 py-4">
        {hasActiveFilters ? (
          <SearchEmptyState
            type="no-results"
            title="No Results Found"
            description="We couldn't find anything matching your filters. Try adjusting them or clear them to start over."
            tierColors={tierColors}
          />
        ) : (
          (() => {
            const entityLabel = entity?.branding.labelPlural ?? 'topics';
            return (
              <SearchEmptyState
                type="initial"
                title={`Find ${entityLabel}`}
                description={`Type in the search bar above or apply filters to find ${entityLabel.toLowerCase()} for your board.`}
                tierColors={tierColors}
              />
            );
          })()
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
    setParams((prev) => ({
      ...prev,
      sort: newSort,
      sortDirection: option?.defaultDirection || SortDirection.ASC,
      // Reset pagination when sort changes
      ...resetPagination(prev.limit),
    }));
  };

  const toggleSortDirection = () => {
    const newDir =
      params.sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC;
    setParams((prev) => ({
      ...prev,
      sortDirection: newDir,
      // Reset pagination when direction changes
      ...resetPagination(prev.limit),
    }));
  };

  const currentSortOption = entity?.sortOptions.find((opt) => opt.id === params.sort);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative mb-4 grid shrink-0 grid-cols-1 gap-2" ref={filterPanelRef}>
        <div className="flex gap-2">
          <input
            placeholder={`Search ${entity?.branding.labelPlural}...`}
            className="border-border focus:border-primary focus:ring-primary w-full rounded-md border bg-black px-3 py-2 text-sm outline-none focus:ring-1"
            value={params.query}
            onChange={(e) => {
              const query = e.target.value;
              setParams((prev) => ({
                ...prev,
                // Reset pagination on new search
                ...resetPagination(prev.limit),
                query,
              }));
            }}
          />

          {entity && entity.sortOptions.length > 1 && (
            <div className="border-border flex shrink-0 gap-1 rounded-md border bg-black p-1">
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
                  className="bg-surface-hover text-secondary hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                  title={`Sort ${params.sortDirection === SortDirection.ASC ? 'Ascending' : 'Descending'} (Click to reverse)`}
                >
                  {params.sortDirection === SortDirection.ASC ? (
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="19" x2="12" y2="5"></line>
                      <polyline points="5 12 12 5 19 12"></polyline>
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <polyline points="19 12 12 19 5 12"></polyline>
                    </svg>
                  )}
                </button>
              )}
            </div>
          )}

          {entity && (entity.filters.length > 0 || entity.searchOptions.length > 0) && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-md border p-2 transition-colors ${showFilters ? 'border-destructive/50 bg-destructive/20 text-destructive' : 'border-border text-secondary hover:text-foreground bg-black'}`}
              title="Toggle Filters"
            >
              <Filter size={18} />
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && entity && (
          <div className="border-border bg-surface absolute top-full right-0 left-0 z-50 mt-1 max-h-[calc(100vh-16rem)] overflow-y-auto rounded-md border p-4 shadow-xl">
            <FilterPanel
              providerId={providerId}
              entity={entity}
              values={params.filters}
              onChange={(newFilters) => {
                setParams((prev) => ({
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
          <div className="bg-destructive/20 text-destructive border-destructive/50 mb-4 rounded-md border p-3 text-sm">
            {error.message}
          </div>
        )}

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {renderContent()}
        </div>

        {/* Pagination Footer */}
        {!isLoading && results.length > 0 && pagination && (
          <div className="border-border mt-2 flex shrink-0 items-center justify-center gap-4 border-t pt-2 pb-2">
            <button
              disabled={!entity?.getPreviousParams(params, { items: results, pagination, raw: [] })}
              onClick={() => {
                const prev = entity?.getPreviousParams(params, {
                  items: results,
                  pagination,
                  raw: [],
                });
                if (prev) setParams(prev);
              }}
              className="bg-surface-hover hover:bg-surface rounded-md p-1 transition-colors disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {'totalPages' in pagination && (
              <span className="text-secondary text-xs">
                Page {'page' in params ? params.page : 1} of {pagination.totalPages}
              </span>
            )}

            <button
              disabled={!entity?.getNextParams(params, { items: results, pagination, raw: [] })}
              onClick={() => {
                const next = entity?.getNextParams(params, { items: results, pagination, raw: [] });
                if (next) setParams(next);
              }}
              className="bg-surface-hover hover:bg-surface rounded-md p-1 transition-colors disabled:opacity-30"
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
