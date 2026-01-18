/**
 * @file MediaPicker.tsx
 * @description A unified search-and-select component for MediaItems (Artists or Albums).
 * Used within search filters to scope results (e.g. searching songs by a specific artist).
 * @module MediaPicker
 */

'use client';

import { Disc, Filter, Mic2,User, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { preload } from 'swr';

import { SearchFilters } from '@/components/search/filters/SearchFilters';
import { getSearchUrl } from '@/lib/api';
import { swrFetcher } from '@/lib/api/fetcher';
import { useMediaSearch } from '@/lib/hooks';
import {
  AlbumItem,
  AlbumSelection,
  ArtistItem,
  ArtistSelection,
  MediaItem,
  MediaSelection,
} from '@/lib/types';

/**
 * Props for the MediaPicker component.
 * @template T - The specific MediaSelection type (ArtistSelection or AlbumSelection).
 */
interface MediaPickerProps<T extends MediaSelection> {
  /** The type of media to search and select. */
  type: 'artist' | 'album';
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
 */
function PickerImage({ src, alt, type }: { src: string; alt: string; type: 'artist' | 'album' }) {
  const [error, setError] = useState(false);
  const [retryUnoptimized, setRetryUnoptimized] = useState(false);

  const PlaceholderIcon = type === 'artist' ? User : Disc;

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-neutral-500">
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
  });

  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Error state for the selected view
  const [selectedImageError, setSelectedImageError] = useState(false);
  const [retryUnoptimized, setRetryUnoptimized] = useState(false);

  const TypeIcon = type === 'artist' ? Mic2 : Disc;
  const SelectedIcon = type === 'artist' ? User : Disc;

  const handleSelect = (item: MediaItem) => {
    let selection: MediaSelection;

    if (type === 'artist') {
      selection = {
        id: item.id,
        name: item.title,
        imageUrl: item.imageUrl,
        disambiguation: (item as ArtistItem).disambiguation,
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

    // Performance: Prefetch related data
    if (type === 'artist') {
      // Smart Prefetch: If we are in a 'song' context (filtering songs by artist), prefetch songs.
      // Otherwise (default/album context), prefetch albums.
      const targetType = context === 'song' ? 'song' : 'album';
      const prefetchUrl = getSearchUrl({
        type: targetType,
        artistId: item.id,
        page: 1,
        fuzzy,
        wildcard,
      });
      preload(prefetchUrl, swrFetcher);
    } else if (type === 'album') {
      // If we select an album, we almost certainly want to see its songs
      const prefetchUrl = getSearchUrl({
        type: 'song',
        albumId: item.id,
        page: 1,
        fuzzy,
        wildcard,
      });
      preload(prefetchUrl, swrFetcher);
    }
  };

  const clearSelection = () => {
    onSelect(null);
    setSelectedImageError(false);
    setRetryUnoptimized(false);
  };

  if (selectedItem) {
    return (
      <div className="flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded p-1 pr-2 text-sm text-neutral-200">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="relative w-8 h-8 rounded bg-neutral-700 shrink-0 overflow-hidden">
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
              <div className="w-full h-full flex items-center justify-center text-neutral-500">
                <SelectedIcon size={14} />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate font-medium text-white text-[11px] leading-tight">
              {selectedItem.name}
            </span>
            {'artist' in selectedItem && selectedItem.artist && (
              <span className="truncate text-neutral-500 text-[9px] leading-tight">
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
      <div className="flex flex-col gap-2 bg-black border border-neutral-700 rounded px-3 py-2 transition-colors focus-within:border-neutral-500">
        <div className="flex items-center gap-2">
          <TypeIcon size={14} className="text-neutral-500 mr-2 shrink-0" />
          <input
            placeholder={placeholder || `Filter by ${type}...`}
            className="bg-transparent outline-none text-sm w-full text-white placeholder-neutral-500"
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
            <div className="w-3 h-3 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin ml-2" />
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 rounded hover:bg-neutral-800 transition-colors ${showFilters ? 'text-red-400' : 'text-neutral-500'}`}
            title="Toggle Filters"
          >
            <Filter size={14} />
          </button>
        </div>

        {showFilters && (
          <div className="pt-2 border-t border-neutral-800">
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
        <div className="absolute z-50 left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
          {results.map((item) => (
            <button
              key={item.id}
              className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm text-neutral-200 border-b border-neutral-800 last:border-0 flex items-center gap-3 group"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
            >
              <div className="relative w-8 h-8 rounded bg-neutral-800 shrink-0 overflow-hidden border border-neutral-700">
                {item.imageUrl ? (
                  <PickerImage src={item.imageUrl} alt={item.title} type={type} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500">
                    <SelectedIcon size={14} />
                  </div>
                )}
              </div>

              <div className="flex flex-col overflow-hidden">
                <span className="font-medium text-white group-hover:text-red-500 transition-colors truncate">
                  {item.title}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-neutral-500 truncate">
                  {type === 'artist' && (item as ArtistItem).disambiguation && (
                    <span className="italic">({(item as ArtistItem).disambiguation})</span>
                  )}
                  {type === 'album' && <span>{(item as AlbumItem).artist}</span>}
                  {item.year && (
                    <span>
                      • {type === 'artist' ? 'Est.' : ''} {item.year}
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
