'use client';

import { useState } from 'react';
import { preload } from 'swr';
import { Search, X, User } from 'lucide-react';
import { MediaItem, ArtistSelection } from '@/lib/types';
import { getSearchUrl } from '@/lib/api';
import { useMediaSearch } from '@/lib/hooks';
import Image from 'next/image';

interface ArtistPickerProps {
  onSelect: (artist: ArtistSelection | null) => void;
  selectedArtist: ArtistSelection | null;
  fuzzy?: boolean;
  wildcard?: boolean;
  context?: string; // Unique context to avoid search state synchronization
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Internal component to handle individual image error states in the list
function PickerImage({ src, alt }: { src: string, alt: string }) {
    const [error, setError] = useState(false);
    const [retryUnoptimized, setRetryUnoptimized] = useState(false);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center text-neutral-500">
                <User size={14} />
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
                }
            }}/>
    );
}

export function ArtistPicker({ onSelect, selectedArtist, fuzzy, wildcard, context }: ArtistPickerProps) {
  const { 
    query, 
    setQuery, 
    results, 
    isLoading,
    searchNow
  } = useMediaSearch('artist', { 
    fuzzy, 
    wildcard,
    ignoreFilters: true, // Ensure we find artists regardless of current Artist Tab filters
    storageKey: context ? `moat-search-params-artist-${context}` : undefined
  });
  
  const [isOpen, setIsOpen] = useState(false);
  
  // Image Error State for the selected artist view
  const [selectedImageError, setSelectedImageError] = useState(false);
  const [retryUnoptimized, setRetryUnoptimized] = useState(false);

  const handleSelect = (artist: MediaItem) => {
    onSelect({ id: artist.id, name: artist.title, imageUrl: artist.imageUrl });
    setIsOpen(false);
    setQuery('');
    // Reset error state for the new selection
    setSelectedImageError(false);
    setRetryUnoptimized(false);
    
    // PREFETCH: Use normalized URL for album search too
    const prefetchUrl = getSearchUrl({ type: 'album', artistId: artist.id, page: 1, fuzzy, wildcard });
    preload(prefetchUrl, fetcher);
  };

  const clearSelection = () => {
    onSelect(null);
    setSelectedImageError(false);
    setRetryUnoptimized(false);
  };

  if (selectedArtist) {
    return (
      <div className="flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded p-1 pr-2 text-sm text-neutral-200">
        <div className="flex items-center gap-2 overflow-hidden">
            <div className="relative w-8 h-8 rounded bg-neutral-700 shrink-0 overflow-hidden">
                {selectedArtist.imageUrl && !selectedImageError ? (
                    <Image 
                        src={selectedArtist.imageUrl} 
                        alt={selectedArtist.name} 
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
                        <User size={14} />
                    </div>
                )}
            </div>
            <span className="truncate font-medium text-white">{selectedArtist.name}</span>
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
        <Search size={14} className="text-neutral-500 mr-2 shrink-0" />
        <input 
            placeholder="Filter by Artist..." 
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
            {results.map((artist) => (
                <button
                    key={artist.id}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm text-neutral-200 border-b border-neutral-800 last:border-0 flex items-center gap-3 group"
                    onMouseDown={(e) => {
                        e.preventDefault(); 
                        handleSelect(artist);
                    }}
                >
                    <div className="relative w-8 h-8 rounded bg-neutral-800 shrink-0 overflow-hidden border border-neutral-700">
                        {artist.imageUrl ? (
                            <PickerImage src={artist.imageUrl} alt={artist.title} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                <User size={14} />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col overflow-hidden">
                        <span className="font-medium text-white group-hover:text-red-500 transition-colors truncate">{artist.title}</span>
                        <div className="flex items-center gap-1 text-[10px] text-neutral-500 truncate">
                            {artist.disambiguation && <span className="italic">({artist.disambiguation})</span>}
                            {artist.year && <span>• Est. {artist.year}</span>}
                        </div>
                    </div>
                </button>
            ))}
        </div>
      )}
    </div>
  );
}