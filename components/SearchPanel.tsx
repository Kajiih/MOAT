'use client';

import { useState } from 'react';
import { Search, Eye, EyeOff, Disc, Mic2, Music, ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaType } from '@/lib/types';
import { useMediaSearch } from '@/lib/hooks';
import { AlbumCard } from '@/components/AlbumCard';
import { ArtistPicker } from '@/components/ArtistPicker';

interface SearchPanelProps {
  addedAlbumIds: Set<string>;
  onLocate: (id: string) => void;
}

export function SearchPanel({ addedAlbumIds, onLocate }: SearchPanelProps) {
  // Search State
  const [searchType, setSearchType] = useState<MediaType>('album');
  const [selectedArtist, setSelectedArtist] = useState<{id: string; name: string; imageUrl?: string} | null>(null);
  const [showAdded, setShowAdded] = useState(true);

  // Use Shared Search Hook
  const { 
    query, setQuery,
    minYear, setMinYear,
    maxYear, setMaxYear,
    page, setPage,
    setArtistId,
    reset,
    results: searchResults,
    totalPages,
    isLoading: isSearching
  } = useMediaSearch(searchType);

  const handleSearchTypeChange = (type: MediaType) => {
      setSearchType(type);
      setSelectedArtist(null);
      reset();
  };

  return (
    <div className="sticky top-4 bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
        <div className="flex flex-wrap items-center gap-4 mb-4 text-white shrink-0">
            <div className="flex items-center gap-2">
                <Search size={20} />
                <h2 className="text-xl font-bold">Search</h2>
            </div>
            
            <button 
                onClick={() => setShowAdded(!showAdded)}
                className={`ml-auto flex items-center gap-2 text-xs px-2 py-1 rounded border ${showAdded ? 'bg-neutral-800 border-neutral-600 text-neutral-300' : 'bg-transparent border-neutral-800 text-neutral-500'}`}
                title={showAdded ? "Hide items already on board" : "Show items already on board"}
            >
                {showAdded ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-black rounded-lg mb-4 shrink-0 border border-neutral-800">
            {(['album', 'artist', 'song'] as const).map((t) => (
                <button
                    key={t}
                    onClick={() => handleSearchTypeChange(t)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all
                        ${searchType === t ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                    `}
                >
                    {t === 'album' && <Disc size={12} />}
                    {t === 'artist' && <Mic2 size={12} />}
                    {t === 'song' && <Music size={12} />}
                    <span className="capitalize">{t}</span>
                </button>
            ))}
        </div>

        <div className="grid grid-cols-1 gap-2 mb-4 shrink-0">
            <input 
                placeholder={`Search ${searchType}s...`} 
                className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                value={query}
                onChange={e => setQuery(e.target.value)}
            />
            
            {searchType !== 'artist' && (
                 <div className="grid grid-cols-1 gap-2">
                    <ArtistPicker 
                        selectedArtist={selectedArtist}
                        onSelect={(artist) => {
                          setSelectedArtist(artist);
                          setArtistId(artist?.id);
                        }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input 
                            placeholder="From Year..." 
                            type="number"
                            className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                            value={minYear}
                            onChange={e => setMinYear(e.target.value)}
                        />
                        <input 
                            placeholder="To Year..." 
                            type="number"
                            className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                            value={maxYear}
                            onChange={e => setMaxYear(e.target.value)}
                        />
                    </div>
                </div>
            )}
            
            {searchType === 'artist' && (
                 <div className="grid grid-cols-2 gap-2">
                    <input 
                        placeholder="Est. From..." 
                        type="number"
                        className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                        value={minYear}
                        onChange={e => setMinYear(e.target.value)}
                    />
                    <input 
                        placeholder="Est. To..." 
                        type="number"
                        className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                        value={maxYear}
                        onChange={e => setMaxYear(e.target.value)}
                    />
                </div>
            )}
        </div>

        <div className="overflow-y-auto min-h-[200px] flex-1 pr-1 custom-scrollbar">
            {isSearching && <div className="text-xs text-neutral-500 animate-pulse mb-2">Querying API...</div>}
            
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3">
                {searchResults.map(item => {
                    const isAdded = addedAlbumIds.has(item.id);
                    if (!showAdded && isAdded) return null;

                    return (
                        <AlbumCard 
                            key={item.id} 
                            item={item}
                            id={`search-${item.id}`} 
                            isAdded={isAdded}
                            onLocate={onLocate}
                        />
                    );
                })}
            </div>
            
            {!isSearching && searchResults.length === 0 && (query || selectedArtist || minYear || maxYear) && (
                <div className="text-center text-neutral-600 italic mt-8 text-sm">No results found.</div>
            )}

            {!isSearching && searchResults.length > 0 && totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button 
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-1 rounded bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-neutral-400">Page {page} of {totalPages}</span>
                    <button 
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="p-1 rounded bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}
