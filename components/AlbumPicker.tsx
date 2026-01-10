'use client';

import { useState } from 'react';
import { Disc, X } from 'lucide-react';
import { MediaItem, AlbumSelection, AlbumItem } from '@/lib/types';
import { useMediaSearch } from '@/lib/hooks';
import Image from 'next/image';

interface AlbumPickerProps {
  onSelect: (album: AlbumSelection | null) => void;
  selectedAlbum: AlbumSelection | null;
  fuzzy?: boolean;
  wildcard?: boolean;
  artistId?: string;
  context?: string; // Unique context to avoid search state synchronization
}

// Internal component to handle individual image error states in the list
function PickerImage({ src, alt }: { src: string, alt: string }) {
    const [error, setError] = useState(false);
    const [retryUnoptimized, setRetryUnoptimized] = useState(false);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center text-neutral-500">
                <Disc size={14} />
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

export function AlbumPicker({ onSelect, selectedAlbum, fuzzy, wildcard, artistId, context }: AlbumPickerProps) {
  const {
    query,
    setQuery,
    results,
    isLoading,
    searchNow
  } = useMediaSearch('album', {
    fuzzy,
    wildcard,
    artistId, // When used as a filter in Song tab, we might want to restrict to current artist
    ignoreFilters: true, // Ensure we find albums regardless of current Album Tab filters
    storageKey: context ? `moat-search-params-album-${context}` : undefined
  });
  const [isOpen, setIsOpen] = useState(false);

  // Image Error State
  const [selectedImageError, setSelectedImageError] = useState(false);
  const [retryUnoptimized, setRetryUnoptimized] = useState(false);

  const handleSelect = (album: AlbumItem) => {
    onSelect({ id: album.id, name: album.title, artist: album.artist, imageUrl: album.imageUrl });
    setIsOpen(false);
    setQuery('');
    // Reset error state
    setSelectedImageError(false);
    setRetryUnoptimized(false);
  };

  const clearSelection = () => {
    onSelect(null);
    setSelectedImageError(false);
    setRetryUnoptimized(false);
  };

  if (selectedAlbum) {
    return (
      <div className="flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded p-1 pr-2 text-sm text-neutral-200">
        <div className="flex items-center gap-2 overflow-hidden">
            <div className="relative w-8 h-8 rounded bg-neutral-700 shrink-0 overflow-hidden">
                {selectedAlbum.imageUrl && !selectedImageError ? (
                    <Image 
                        src={selectedAlbum.imageUrl} 
                        alt={selectedAlbum.name} 
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
                        <Disc size={14} />
                    </div>
                )}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="truncate font-medium text-white text-[11px] leading-tight">{selectedAlbum.name}</span>
                <span className="truncate text-neutral-500 text-[9px] leading-tight">{selectedAlbum.artist}</span>
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
      <div className="flex items-center bg-black border border-neutral-700 rounded px-3 py-2 focus-within:border-red-600 transition-colors">
        <Disc size={14} className="text-neutral-500 mr-2 shrink-0" />
        <input 
            placeholder="Filter by Album..." 
            className="bg-transparent outline-none text-sm w-full text-white placeholder-neutral-500"
            value={query}
            onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(!!e.target.value);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    searchNow();
                    setIsOpen(true);
                }
            }}
            onFocus={() => { if(query) setIsOpen(true); }}
            onBlur={() => {
                 setTimeout(() => setIsOpen(false), 200); 
            }}
        />
        {isLoading && <div className="w-3 h-3 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin ml-2" />}
      </div>

      {isOpen && (results.length > 0) && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
            {results.map((album) => (
                <button
                    key={album.id}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm text-neutral-200 border-b border-neutral-800 last:border-0 flex items-center gap-3 group"
                    onMouseDown={(e) => {
                        e.preventDefault(); 
                        handleSelect(album as AlbumItem);
                    }}
                >
                    <div className="relative w-8 h-8 rounded bg-neutral-800 shrink-0 overflow-hidden border border-neutral-700">
                        {album.imageUrl ? (
                            <PickerImage src={album.imageUrl} alt={album.title} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                <Disc size={14} />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col overflow-hidden">
                        <span className="font-medium text-white group-hover:text-red-500 transition-colors truncate">{album.title}</span>
                        <div className="flex items-center gap-1 text-[10px] text-neutral-500 truncate">
                            <span>{(album as AlbumItem).artist}</span>
                            {album.year && <span>• {album.year}</span>}
                        </div>
                    </div>
                </button>
            ))}
        </div>
      )}
    </div>
  );
}
