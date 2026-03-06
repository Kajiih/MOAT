/**
 * @file ItemPicker.tsx
 * @description A unified search-and-select component for items (Artists, Albums, or Authors).
 * Used within search filters to scope results (e.g. searching songs by a specific artist).
 * @module ItemPicker
 */

'use client';

import { Filter, X } from 'lucide-react';
import { useState } from 'react';

import { itemTypeRegistry } from '@/lib/media-types';
import { SearchFilters } from '@/v1/components/search/filters/SearchFilters';
import { useItemSearch } from '@/v1/components/search/hooks/useItemSearch';
import {
  Item,
  ItemSelection,
} from '@/v1/lib/types';

import { ItemImage } from './ItemImage';

/**
 * Props for the ItemPicker component.
 * @template T - The specific ItemSelection type (ArtistSelection or AlbumSelection).
 */
interface ItemPickerProps<T extends ItemSelection> {
  /** The type of entity to search and select. */
  type: 'artist' | 'album' | 'author';
  /** Callback fired when an item is selected. */
  onSelect: (item: T | null) => void;
  /** The currently selected item. */
  selectedItem: T | null;
  /** Whether to use fuzzy matching for the search. */
  fuzzy?: boolean;
  /** Whether to use wildcards for the search. */
  wildcard?: boolean;
  /** Optional artist ID to scope searches (e.g., search albums for a specific artist). */
  artistId?: string;
  /** Unique context identifier to isolate search state and persistence. */
  context?: string;
  /** Custom placeholder for the search input. */
  placeholder?: string;
}

/**
 * A reusable search-and-select component for finding and picking specific items.
 * Features inline filtering, search configuration, and intelligent prefetching.
 * @param props - The props for the component.
 * @param props.type
 * @param props.onSelect
 * @param props.selectedItem
 * @param props.fuzzy
 * @param props.wildcard
 * @param props.artistId
 * @param props.context
 * @param props.placeholder
 * @returns The rendered ItemPicker component.
 */
export function ItemPicker<T extends ItemSelection>({
  type,
  onSelect,
  selectedItem,
  fuzzy,
  wildcard,
  artistId,
  context,
  placeholder,
}: ItemPickerProps<T>) {
  const { filters, updateFilters, results, isLoading, searchNow } = useItemSearch(type, {
    fuzzy,
    wildcard,
    artistId,
    storageKey: context ? `moat-search-params-${type}-${context}` : undefined,
    prefetchEnabled: false,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const definition = itemTypeRegistry.get(type);

  // Icons based on type
  const TypeIcon = definition.icon;
  const SelectedIcon = definition.icon;

  const handleSelect = (item: Item) => {
    let selection: ItemSelection;

    if (type === 'artist' || type === 'author') {
      selection = {
        id: item.id,
        name: item.title,
        imageUrl: item.images.find(img => img.type === 'url')?.url,
        disambiguation: item.id,
      } as ItemSelection;
    } else {
      selection = {
        id: item.id,
        name: item.title,
        imageUrl: item.images.find(img => img.type === 'url')?.url,
        artist: item.subtitle,
      } as ItemSelection;
    }

    onSelect(selection as T);
    setIsOpen(false);
    updateFilters({ query: '' });
  };

  const clearSelection = () => {
    onSelect(null);
  };

  if (selectedItem) {
    return (
      <div className="flex items-center justify-between rounded border border-neutral-700 bg-neutral-800 p-1 pr-2 text-sm text-neutral-200">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-neutral-700">
            {selectedItem.imageUrl ? (
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-500">
                <SelectedIcon size={16} />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[11px] leading-tight font-medium text-white">
              {selectedItem.name}
            </span>
            {'artist' in selectedItem && selectedItem.artist && (
              <span className="truncate text-[9px] leading-tight text-neutral-500">
                {selectedItem.artist}
              </span>
            )}
          </div>
        </div>
        <button onClick={clearSelection} className="ml-2 text-neutral-400 hover:text-red-400">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex flex-col gap-2 rounded border border-neutral-700 bg-black px-3 py-2 transition-colors focus-within:border-neutral-500">
        <div className="flex items-center gap-2">
          <TypeIcon size={14} className="mr-2 shrink-0 text-neutral-500" />
          <input
            placeholder={placeholder || `Filter by ${type}...`}
            className="w-full bg-transparent text-sm text-white placeholder-neutral-500 outline-none"
            value={filters.query}
            onChange={(e) => {
              updateFilters({ query: e.target.value });
              setIsOpen(!!e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                searchNow();
                setIsOpen(true);
              }
            }}
            onFocus={() => {
              if (filters.query) setIsOpen(true);
            }}
          />
          {isLoading && (
            <div className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded p-1 transition-colors hover:bg-neutral-800 ${showFilters ? 'text-red-400' : 'text-neutral-500'}`}
            title="Toggle Filters"
          >
            <Filter size={14} />
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-neutral-800 pt-2">
            <SearchFilters
              type={type}
              filters={filters}
              updateFilters={updateFilters}
              compact={true}
            />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="custom-scrollbar absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
          {results.map((item) => (
            <button
              key={item.id}
              className="group flex w-full items-center gap-3 border-b border-neutral-800 px-3 py-2 text-left text-sm text-neutral-200 last:border-0 hover:bg-neutral-800"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
            >
              <ItemImage
                item={item}
                TypeIcon={SelectedIcon}
                containerClassName="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-neutral-700 bg-neutral-800"
                sizes="32px"
              />

              <div className="flex flex-col overflow-hidden">
                <span className="truncate font-medium text-white transition-colors group-hover:text-red-500">
                  {item.title}
                </span>
                <div className="flex items-center gap-1 truncate text-[10px] text-neutral-500">
                  <span>{definition.getSubtitle(item)}</span>
                  {definition.getTertiaryText(item) && (
                    <>
                      <span className="opacity-50">•</span>
                      <span>{definition.getTertiaryText(item)}</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
