/**
 * @file MediaPicker.tsx
 * @description A unified search-and-select component for MediaItems (Artists or Albums).
 * Used within search filters to scope results (e.g. searching songs by a specific artist).
 * @module MediaPicker
 */

'use client';

import { Disc, Filter, Mic2, User, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { SearchFilters } from '@/components/search/filters/SearchFilters';
import { useMediaSearch } from '@/components/search/hooks/useMediaSearch';
import {
  AlbumItem,
  AlbumSelection,
  ArtistItem,
  ArtistSelection,
  AuthorItem,
  MediaItem,
  MediaSelection,
} from '@/lib/types';

/**
 * Props for the MediaPicker component.
 * @template T - The specific MediaSelection type (ArtistSelection or AlbumSelection).
 */
interface MediaPickerProps<T extends MediaSelection> {
  /** The type of media to search and select. */
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
 * Internal component to handle individual image error states in the list.
 * @param props - The props for the component.
 * @param props.src - The image source URL.
 * @param props.alt - The alt text for the image.
 * @param props.type - The type of media.
 * @returns The rendered PickerImage component.
 */
function PickerImage({ src, alt, type }: { src: string; alt: string; type: 'artist' | 'album' | 'author' }) {
  const [error, setError] = useState(false);
  const [retryUnoptimized, setRetryUnoptimized] = useState(false);

  const PlaceholderIcon = (type === 'artist' || type === 'author') ? User : Disc;

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-neutral-500">
        <PlaceholderIcon size={14} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="96px"
      className="object-cover"
      unoptimized={retryUnoptimized}
      onError={() => {
        if (!retryUnoptimized) {
          setRetryUnoptimized(true);
        } else {
          setError(true);
        }
      }}
    />
  );
}

/**
 * A reusable search-and-select component for finding and picking artists or albums.
 * Features inline filtering, search configuration, and intelligent prefetching.
 * @param props - The props for the component.
 * @param props.type - The type of media to search and select.
 * @param props.onSelect - Callback fired when an item is selected.
 * @param props.selectedItem - The currently selected item.
 * @param props.fuzzy - Whether to use fuzzy matching for the search.
 * @param props.wildcard - Whether to use wildcards for the search.
 * @param props.artistId - Optional artist ID to scope searches (e.g., search albums for a specific artist).
 * @param props.context - Unique context identifier to isolate search state and persistence.
 * @param props.placeholder - Custom placeholder for the search input.
 * @returns The rendered MediaPicker component.
 */
export function MediaPicker<T extends MediaSelection>({
  type,
  onSelect,
  selectedItem,
  fuzzy,
  wildcard,
  artistId,
  context,
  placeholder,
}: MediaPickerProps<T>) {
  const { filters, updateFilters, results, isLoading, searchNow } = useMediaSearch(type, {
    fuzzy,
    wildcard,
    artistId,
    storageKey: context ? `moat-search-params-${type}-${context}` : undefined,
    prefetchEnabled: false,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Error state for the selected view
  const [selectedImageError, setSelectedImageError] = useState(false);
  const [retryUnoptimized, setRetryUnoptimized] = useState(false);

  // Determine icons based on type
  let TypeIcon;
  let SelectedIcon;
  
  if (type === 'artist') {
    TypeIcon = Mic2;
    SelectedIcon = User;
  } else if (type === 'author') {
    TypeIcon = User;
    SelectedIcon = User;
  } else {
    TypeIcon = Disc;
    SelectedIcon = Disc;
  }

  const handleSelect = (item: MediaItem) => {
    let selection: MediaSelection;

    // Music Specific logic (keeping legacy support for now)
    if (type === 'artist' || type === 'author') {
      selection = {
        id: item.id,
        name: item.title,
        imageUrl: item.imageUrl,
        disambiguation: (item as ArtistItem | AuthorItem).id, // Using ID or disambiguation if available
      } as ArtistSelection;
    } else {
      selection = {
        id: item.id,
        name: item.title,
        imageUrl: item.imageUrl,
        artist: (item as AlbumItem).artist,
      } as AlbumSelection;
    }

    onSelect(selection as T);
    setIsOpen(false);
    updateFilters({ query: '' });
    setSelectedImageError(false);
    setRetryUnoptimized(false);
  };

  const clearSelection = () => {
    onSelect(null);
    setSelectedImageError(false);
    setRetryUnoptimized(false);
  };

  // Helper to determine year label
  const getYearLabel = () => {
      if (type === 'artist') return 'Est.';
      if (type === 'author') return 'Born';
      return '';
  };

  if (selectedItem) {
    return (
      <div className="flex items-center justify-between rounded border border-neutral-700 bg-neutral-800 p-1 pr-2 text-sm text-neutral-200">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-neutral-700">
            {selectedItem.imageUrl && !selectedImageError ? (
              <Image
                src={selectedItem.imageUrl}
                alt={selectedItem.name}
                fill
                sizes="96px"
                className="object-cover"
                unoptimized={retryUnoptimized}
                onError={() => {
                  if (!retryUnoptimized) {
                    setRetryUnoptimized(true);
                  } else {
                    setSelectedImageError(true);
                  }
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-500">
                <SelectedIcon size={14} />
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
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-neutral-700 bg-neutral-800">
                {item.imageUrl ? (
                  <PickerImage src={item.imageUrl} alt={item.title} type={type} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-500">
                    <SelectedIcon size={14} />
                  </div>
                )}
              </div>

              <div className="flex flex-col overflow-hidden">
                <span className="truncate font-medium text-white transition-colors group-hover:text-red-500">
                  {item.title}
                </span>
                <div className="flex items-center gap-1 truncate text-[10px] text-neutral-500">
                  {type === 'artist' && (item as ArtistItem).disambiguation && (
                    <span className="italic">({(item as ArtistItem).disambiguation})</span>
                  )}
                  {type === 'album' && <span>{(item as AlbumItem).artist}</span>}
                  {item.year && (
                    <span>
                      • {getYearLabel()} {item.year}
                    </span>
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
