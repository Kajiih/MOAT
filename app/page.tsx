'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { Album, TierMap } from '@/lib/types';
import { AlbumCard } from '@/components/AlbumCard';
import { Download, Upload, Trash2, Search } from 'lucide-react';

const INITIAL_TIERS: TierMap = { S: [], A: [], B: [], C: [], D: [] };
const TIER_COLORS: Record<string, string> = {
  S: 'bg-red-500', A: 'bg-orange-500', B: 'bg-yellow-500', C: 'bg-green-500', D: 'bg-blue-500'
};

// Sub-component for a Tier Row
function TierRow({ id, albums, onRemove }: { id: string, albums: Album[], onRemove: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex bg-neutral-900 border border-neutral-800 min-h-[7rem] mb-2 overflow-hidden rounded-lg">
      <div className={`w-24 flex items-center justify-center text-3xl font-black text-black select-none ${TIER_COLORS[id]}`}>
        {id}
      </div>
      <div 
        ref={setNodeRef} 
        className={`flex-1 flex flex-wrap items-center gap-2 p-3 transition-colors ${isOver ? 'bg-neutral-800' : ''}`}
      >
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} tierId={id} onRemove={(albId) => onRemove(albId)} />
        ))}
      </div>
    </div>
  );
}

export default function TierListApp() {
  // --- 1. MOUNT CHECK STATE ---
  const [isMounted, setIsMounted] = useState(false);

  // App State
  const [tiers, setTiers] = useState<TierMap>(INITIAL_TIERS);
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  
  // Search State
  const [search, setSearch] = useState({ title: '', artist: '', year: '' });
  const [debouncedSearch] = useDebounce(search, 500);
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- 2. MOUNT EFFECT ---
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load from LocalStorage (Only runs on client)
  useEffect(() => {
    if (!isMounted) return; // Wait for mount
    const saved = localStorage.getItem('julian-tierlist');
    if (saved) {
      try { setTiers(JSON.parse(saved)); } catch (e) { console.error("Save Corrupt", e); }
    }
  }, [isMounted]);

  // Save to LocalStorage
  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('julian-tierlist', JSON.stringify(tiers));
  }, [tiers, isMounted]);

  // Fetch Logic
  useEffect(() => {
    const { title, artist, year } = debouncedSearch;
    if (!title && !artist && !year) {
        setSearchResults([]);
        return;
    }

    async function fetchData() {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if(title) params.append('title', title);
        if(artist) params.append('artist', artist);
        if(year) params.append('year', year);

        const res = await fetch(`/api/search?${params.toString()}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }
    fetchData();
  }, [debouncedSearch]);

  // Actions
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tiers));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `tierlist-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const parsed = JSON.parse(ev.target?.result as string);
            setTiers(parsed); 
        } catch(err) { alert("Invalid JSON file"); }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if(confirm("Clear everything?")) setTiers(INITIAL_TIERS);
  };

  // DND Handlers
  const handleDragStart = (e: DragStartEvent) => {
    setActiveAlbum(e.active.data.current?.album);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || !activeAlbum) {
        setActiveAlbum(null);
        return;
    }

    const sourceTier = active.data.current?.sourceTier;
    const targetTier = over.id as string;

    setTiers(prev => {
        const next = { ...prev };
        if (sourceTier && next[sourceTier]) {
            next[sourceTier] = next[sourceTier].filter(a => a.id !== activeAlbum.id);
        }
        if (next[targetTier]) {
            next[targetTier] = next[targetTier].filter(a => a.id !== activeAlbum.id);
            next[targetTier].push(activeAlbum);
        }
        return next;
    });
    setActiveAlbum(null);
  };

  const removeAlbumFromTier = (tierId: string, albumId: string) => {
    setTiers(prev => ({
        ...prev,
        [tierId]: prev[tierId].filter(a => a.id !== albumId)
    }));
  };

  // --- 3. RETURN LOADING STATE IF NOT MOUNTED ---
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-black tracking-tighter text-white animate-pulse">
            TIER<span className="text-red-600">MASTER</span>
        </h1>
        <div className="text-neutral-500 text-sm">Loading application...</div>
      </div>
    );
  }

  // --- 4. RENDER ACTUAL APP ---
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-4xl font-black tracking-tighter text-white">TIER<span className="text-red-600">MASTER</span></h1>
          
          <div className="flex gap-2">
            <label className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded cursor-pointer hover:bg-neutral-700 text-sm">
                <Upload size={16} /> Import
                <input type="file" onChange={handleImport} accept=".json" className="hidden" />
            </label>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded hover:bg-neutral-700 text-sm">
                <Download size={16} /> Export
            </button>
            <button onClick={handleClear} className="flex items-center gap-2 px-3 py-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40 text-sm border border-red-900/50">
                <Trash2 size={16} /> Clear
            </button>
          </div>
        </header>

        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            
            {/* Board */}
            <div className="mb-12 space-y-2">
                {Object.keys(tiers).map(tier => (
                    <TierRow 
                        key={tier} 
                        id={tier} 
                        albums={tiers[tier]} 
                        onRemove={(albumId) => removeAlbumFromTier(tier, albumId)} 
                    />
                ))}
            </div>

            {/* Search */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4 text-white">
                    <Search size={20} />
                    <h2 className="text-xl font-bold">Search Database</h2>
                    {isSearching && <span className="text-xs text-neutral-500 animate-pulse ml-auto">Querying API...</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <input 
                        placeholder="Album Title..." 
                        className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none"
                        value={search.title}
                        onChange={e => setSearch({...search, title: e.target.value})}
                    />
                    <input 
                        placeholder="Artist..." 
                        className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none"
                        value={search.artist}
                        onChange={e => setSearch({...search, artist: e.target.value})}
                    />
                    <input 
                        placeholder="Year..." 
                        type="number"
                        className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none"
                        value={search.year}
                        onChange={e => setSearch({...search, year: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 min-h-[100px]">
                    {searchResults.map(album => (
                        <AlbumCard key={album.id} album={album} />
                    ))}
                    {!isSearching && searchResults.length === 0 && (search.title || search.artist) && (
                        <div className="col-span-full text-center text-neutral-600 italic mt-8">No results found.</div>
                    )}
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeAlbum ? <AlbumCard album={activeAlbum} /> : null}
            </DragOverlay>

        </DndContext>
      </div>
    </div>
  );
}
