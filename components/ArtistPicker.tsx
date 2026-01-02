'use client';

import { useState } from 'react';
import { preload } from 'swr';
import { Search, X, User } from 'lucide-react';
import { MediaItem } from '@/lib/types';
import { getSearchUrl } from '@/lib/api';
import { useMediaSearch } from '@/lib/hooks';
import Image from 'next/image';

interface ArtistPickerProps {
  onSelect: (artist: { id: string; name: string; imageUrl?: string } | null) => void;
  selectedArtist: { id: string; name: string; imageUrl?: string } | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ArtistPicker({ onSelect, selectedArtist }: ArtistPickerProps) {
  const { 
    query, 
    setQuery, 
    results, 
    isLoading 
  } = useMediaSearch('artist');
  
  const [isOpen, setIsOpen] = useState(false);

  // useEffect removed

  const handleSelect = (artist: MediaItem) => {
    onSelect({ id: artist.id, name: artist.title, imageUrl: artist.imageUrl });
    setIsOpen(false);
    setQuery('');
    
    // PREFETCH: Use normalized URL for album search too
    const prefetchUrl = getSearchUrl({ type: 'album', artistId: artist.id, page: 1 });
    preload(prefetchUrl, fetcher);
  };

  const clearSelection = () => {
    onSelect(null);
  };

  if (selectedArtist) {
    return (
      <div className="flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded p-1 pr-2 text-sm text-neutral-200">
        <div className="flex items-center gap-2 overflow-hidden">
            <div className="relative w-8 h-8 rounded bg-neutral-700 shrink-0 overflow-hidden">
                {selectedArtist.imageUrl ? (
                    <Image 
                        src={selectedArtist.imageUrl} 
                        alt={selectedArtist.name} 
                        fill 
                        className="object-cover"
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
                            <Image 
                                src={artist.imageUrl} 
                                alt={artist.title} 
                                fill 
                                className="object-cover"
                            />
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