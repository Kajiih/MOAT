/**
 * @file SearchTab.tsx
 * @description A self-contained tab content for a specific V2 search entity.
 */

'use client';

import { Filter } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { ItemCard } from '@/components/media/ItemCard';
import { Pagination } from '@/components/ui/Pagination';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SortDropdown } from '@/components/ui/SortDropdown';
import { useItemSearch } from '@/lib/database/hooks/useItemSearch';
import { registry } from '@/lib/database/registry';
import { StandardItem } from '@/lib/database/types';

import { FilterPanel } from './FilterPanel';

interface SearchTabProps {
  providerId: string;
  entityId: string;
  addedItemIds: Set<string>;
  onLocate: (id: string) => void;
  isHidden: boolean;
  showAdded: boolean;
  onInfo: (item: StandardItem) => void;
}

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
  
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [sort, setSort] = useState<string | undefined>(entity?.sortOptions[0]?.id);
  const [showFilters, setShowFilters] = useState(false);

  const {
    results,
    pagination,
    isLoading,
    error,
  } = useItemSearch(providerId, entityId, {
    query,
    page,
    filters,
    sort,
  }, {
    enabled: !isHidden,
  });

  const finalResults = useMemo(() => {
    if (showAdded) return results;
    return (results as StandardItem[]).filter((item: StandardItem) => !addedItemIds.has(item.id));
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
                  item={item as StandardItem}
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
        {(query || Object.keys(filters).length > 0) && (
          <div className="mt-8 text-center text-sm text-neutral-600 italic">No results found.</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 grid shrink-0 grid-cols-1 gap-2">
        <div className="flex gap-2">
          <input
            placeholder={`Search ${entity?.branding.labelPlural}...`}
            className="w-full rounded border border-neutral-700 bg-black px-3 py-2 text-sm outline-none focus:border-red-600"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />

          {entity && entity.sortOptions.length > 0 && (
            <SortDropdown
              sortOption={sort || ''}
              onSortChange={(val) => {
                setSort(val);
                setPage(1);
              }}
              options={entity.sortOptions.map((opt) => ({
                label: opt.label,
                value: opt.id,
              }))}
            />
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded border p-2 transition-colors ${showFilters ? 'border-red-900/50 bg-red-900/20 text-red-400' : 'border-neutral-700 bg-black text-neutral-400 hover:text-white'}`}
            title="Toggle Filters"
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && entity && (
          <div className="rounded border border-neutral-800 bg-neutral-900/50 p-2">
            <FilterPanel
              entity={entity}
              values={filters}
              onChange={(newFilters) => {
                setFilters(newFilters);
                setPage(1);
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
        {!isLoading && pagination && (
          <div className="mt-2 flex shrink-0 items-center justify-center gap-4 border-t border-neutral-800 pt-2">
             {'totalPages' in pagination && (
                <Pagination 
                   page={page} 
                   totalPages={(pagination as any).totalPages} 
                   onPageChange={setPage} 
                />
             )}
          </div>
        )}
      </div>
    </div>
  );
}
