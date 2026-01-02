'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { Check, Search, X } from 'lucide-react';
import { MediaItem } from '@/lib/types';

interface ArtistPickerProps {
  onSelect: (artist: { id: string; name: string } | null) => void;
  selectedArtist: { id: string; name: string } | null;
}

export function ArtistPicker({ onSelect, selectedArtist }: ArtistPickerProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 500);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery) {
        setResults([]);
        return;
    }

    async function fetchArtists() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?type=artist&query=${encodeURIComponent(debouncedQuery)}`);
        const data = await res.json();
        setResults(data.results || []);
        setIsOpen(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchArtists();
  }, [debouncedQuery]);

  const handleSelect = (artist: MediaItem) => {
    onSelect({ id: artist.id, name: artist.title });
    setIsOpen(false);
    setQuery(''); // Reset search input
  };

  const clearSelection = () => {
    onSelect(null);
  };

  if (selectedArtist) {
    return (
      <div className="flex items-center justify-between bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-200">
        <span className="truncate flex-1 font-medium text-white">{selectedArtist.name}</span>
        <button onClick={clearSelection} className="ml-2 hover:text-red-400">
            <X size={14} />
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
                if (e.target.value === '') setIsOpen(false);
            }}
            onFocus={() => { if(results.length > 0) setIsOpen(true); }}
            onBlur={() => {
                 // Slight delay to allow click on dropdown item
                 setTimeout(() => setIsOpen(false), 200); 
            }}
        />
        {isLoading && <div className="w-3 h-3 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin ml-2" />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
            {results.map((artist) => (
                <button
                    key={artist.id}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm text-neutral-200 border-b border-neutral-800 last:border-0 flex items-center justify-between group"
                    onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input blur
                        handleSelect(artist);
                    }}
                >
                    <div className="flex flex-col">
                        <span className="font-medium text-white group-hover:text-red-500 transition-colors">{artist.title}</span>
                        {artist.year && <span className="text-[10px] text-neutral-500">Est. {artist.year}</span>}
                    </div>
                    {/* Add visual check if needed, though selection closes dropdown */}
                </button>
            ))}
        </div>
      )}
    </div>
  );
}