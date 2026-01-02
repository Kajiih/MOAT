'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  DragOverEvent,
  useDroppable,
  closestCenter,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDndContext
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy 
} from '@dnd-kit/sortable';
import { MediaItem, MediaType, TierMap } from '@/lib/types';
import { AlbumCard, SortableAlbumCard } from '@/components/AlbumCard';
import { ArtistPicker } from '@/components/ArtistPicker'; 
import { Download, Upload, Trash2, Search, Eye, EyeOff, Disc, Mic2, Music } from 'lucide-react';

const INITIAL_TIERS: TierMap = { S: [], A: [], B: [], C: [], D: [] };
const TIER_COLORS: Record<string, string> = {
  S: 'bg-red-500', A: 'bg-orange-500', B: 'bg-yellow-500', C: 'bg-green-500', D: 'bg-blue-500'
};

// Sub-component for a Tier Row
function TierRow({ id, albums, onRemove }: { id: string, albums: MediaItem[], onRemove: (id: string) => void }) {
  // Use `useDroppable` for the container ref
  const { setNodeRef } = useDroppable({ 
    id,
    data: { isTierContainer: true } 
  });

  const { over } = useDndContext();

  const isOverRow = useMemo(() => {
    if (!over) return false;
    // 1. Is the cursor directly over the container?
    if (over.id === id) return true;
    // 2. Is the cursor over any item strictly inside this container?
    return albums.some(a => a.id === over.id);
  }, [over, id, albums]);

  return (
    <div className={`flex bg-neutral-900 border min-h-[7rem] mb-2 overflow-hidden rounded-lg transition-colors duration-200 ${isOverRow ? 'border-neutral-500 bg-neutral-800' : 'border-neutral-800'}`}>
      <div className={`w-24 flex items-center justify-center text-3xl font-black text-black select-none ${TIER_COLORS[id]}`}>
        {id}
      </div>
      <div 
        ref={setNodeRef} 
        className="flex-1 flex flex-wrap items-center gap-2 p-3 relative"
      >
        {isOverRow && <div className="absolute inset-0 bg-white/5 pointer-events-none" />}
        <SortableContext id={id} items={albums.map(a => a.id)} strategy={rectSortingStrategy}>
          {albums.map((item) => {
            return (
              <SortableAlbumCard 
                key={item.id} 
                item={item} 
                id={item.id} 
                tierId={id} 
                onRemove={(albId) => onRemove(albId)} 
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}

export default function TierListApp() {
  // --- 1. MOUNT CHECK STATE ---
  const [isMounted, setIsMounted] = useState(false);

  // App State
  const [tiers, setTiers] = useState<TierMap>(INITIAL_TIERS);
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null); // Track active draggable ID
  
  // Search State
  const [searchType, setSearchType] = useState<MediaType>('album');
  
  // Filter States
  const [search, setSearch] = useState({ query: '', minYear: '', maxYear: '' });
  const [selectedArtist, setSelectedArtist] = useState<{id: string, name: string} | null>(null);
  
  const [debouncedSearch] = useDebounce(search, 500);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdded, setShowAdded] = useState(true);

  // Derived State: Set of all Added Album IDs (Clean IDs)
  const addedAlbumIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(tiers).forEach(tierList => {
        tierList.forEach(item => {
            // Strip "search-" prefix if present
            const cleanId = item.id.replace(/^search-/, '');
            ids.add(cleanId);
        });
    });
    return ids;
  }, [tiers]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    const { query, minYear, maxYear } = debouncedSearch;
    // We can fetch if we have a query OR a selected artist OR a year filter
    if (!query && !minYear && !maxYear && !selectedArtist) {
        setSearchResults([]);
        return;
    }

    async function fetchData() {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        params.append('type', searchType);
        if(query) params.append('query', query);
        if(minYear) params.append('minYear', minYear);
        if(maxYear) params.append('maxYear', maxYear);
        
        // Pass artist ID if selected
        if(selectedArtist) {
            params.append('artistId', selectedArtist.id);
        }

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
  }, [debouncedSearch, searchType, selectedArtist]); // Re-run when filters change

  // Clear search results/inputs when type changes
  useEffect(() => {
      setSearchResults([]);
      setSearch({ query: '', minYear: '', maxYear: '' });
      setSelectedArtist(null);
  }, [searchType]);

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

  const removeAlbumFromTier = (tierId: string, itemId: string) => {
    // Handle both clean IDs and temporary search IDs
    setTiers(prev => ({
        ...prev,
        [tierId]: prev[tierId].filter(a => a.id !== itemId && a.id !== `search-${itemId}`)
    }));
  };

  const handleLocate = (id: string) => {
    const el = document.getElementById(`media-card-${id}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.3s';
        el.style.boxShadow = '0 0 20px 5px rgba(255, 255, 255, 0.5)';
        setTimeout(() => {
            el.style.boxShadow = '';
        }, 1500);
    } else {
        alert("Could not locate item on board.");
    }
  };

  // DND Logic Helper
  const findContainer = (id: string) => {
    if (id in tiers) return id;
    return Object.keys(tiers).find((key) => tiers[key].find((a) => a.id === id));
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveItem(e.active.data.current?.album);
    setActiveId(e.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const activeTierId = active.data.current?.sourceTier;
    
    // We allow logic even if sourceTier is missing (Search -> Tier)
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the containers
    const activeContainer = activeTierId || findContainer(activeId as string); 
    const overContainer = findContainer(overId as string);

    if (!overContainer) {
        return; // Dropped outside valid containers
    }

    if (!activeContainer) {
        // Case: Search Item -> Tier (First Entry)
        // GLOBAL DUPLICATE CHECK (During Drag)
        const cleanId = active.data.current?.album.id;
        if (addedAlbumIds.has(cleanId)) return; 

        setTiers((prev) => {
            const activeItem = active.data.current?.album;
            if(!activeItem) return prev;

            const overItems = prev[overContainer];
            const overIndex = overItems.findIndex((item) => item.id === overId);
            
            let newIndex;
            if (overId in prev) {
                newIndex = overItems.length + 1;
            } else {
                const isBelowOverItem =
                  over &&
                  active.rect.current.translated &&
                  active.rect.current.translated.top > over.rect.top + over.rect.height;
                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            // Create a temporary album object with the SEARCH ID
            const tempItem = { ...activeItem, id: activeId as string };

            return {
                ...prev,
                [overContainer]: [
                    ...prev[overContainer].slice(0, newIndex),
                    tempItem,
                    ...prev[overContainer].slice(newIndex, prev[overContainer].length),
                ],
            };
        });
        return;
    }

    if (activeContainer === overContainer) {
        setTiers((prev) => {
            const activeItems = prev[activeContainer];
            const overItems = prev[overContainer];
            const activeIndex = activeItems.findIndex((item) => item.id === activeId);
            const overIndex = overItems.findIndex((item) => item.id === overId);
            
            if (activeIndex !== overIndex) {
                 return {
                    ...prev,
                    [activeContainer]: arrayMove(prev[activeContainer], activeIndex, overIndex),
                 };
            }
            return prev;
        });
        return;
    }

    // Move between different containers
    setTiers((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((item) => item.id === activeId);
      const overIndex = overItems.findIndex((item) => item.id === overId);

      let newIndex;
      if (overId in prev) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        [activeContainer]: [
          ...prev[activeContainer].filter((item) => item.id !== activeId),
        ],
        [overContainer]: [
          ...prev[overContainer].slice(0, newIndex),
          activeItems[activeIndex],
          ...prev[overContainer].slice(newIndex, prev[overContainer].length),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setActiveId(null);

    // Clean up temporary IDs
    setTiers(prev => {
        const next = { ...prev };
        let modified = false;

        Object.keys(next).forEach(key => {
            const list = next[key];
            const needsFix = list.some(a => a.id.startsWith('search-'));
            
            if (needsFix) {
                next[key] = list.map(a => {
                    if (a.id.startsWith('search-')) {
                        const originalId = a.id.replace('search-', '');
                        return { ...a, id: originalId };
                    }
                    return a;
                });
                modified = true;
            }
        });

        return modified ? next : prev;
    });

    if (!over) return;
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
      <div className="max-w-[1600px] mx-auto">
        
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

        <DndContext 
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart} 
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
                {/* Board */}
                <div className="space-y-2">
                    {Object.keys(tiers).map(tier => (
                        <TierRow 
                            key={tier} 
                            id={tier} 
                            albums={tiers[tier]} 
                            onRemove={(itemId) => removeAlbumFromTier(tier, itemId)} 
                        />
                    ))}
                </div>

                {/* Search Sidebar */}
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

                    {/* Type Tabs */}
                    <div className="grid grid-cols-3 gap-1 p-1 bg-black rounded-lg mb-4 shrink-0 border border-neutral-800">
                        {(['album', 'artist', 'song'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setSearchType(t)}
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
                            value={search.query}
                            onChange={e => setSearch({...search, query: e.target.value})}
                        />
                        
                        {/* Only show artist filter for Album/Song types */}
                        {searchType !== 'artist' && (
                             <div className="grid grid-cols-1 gap-2">
                                <ArtistPicker 
                                    selectedArtist={selectedArtist}
                                    onSelect={setSelectedArtist}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input 
                                        placeholder="From Year..." 
                                        type="number"
                                        className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                                        value={search.minYear}
                                        onChange={e => setSearch({...search, minYear: e.target.value})}
                                    />
                                    <input 
                                        placeholder="To Year..." 
                                        type="number"
                                        className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                                        value={search.maxYear}
                                        onChange={e => setSearch({...search, maxYear: e.target.value})}
                                    />
                                </div>
                            </div>
                        )}
                        
                        {/* Only show Year for Artist */}
                        {searchType === 'artist' && (
                             <div className="grid grid-cols-2 gap-2">
                                <input 
                                    placeholder="Est. From..." 
                                    type="number"
                                    className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                                    value={search.minYear}
                                    onChange={e => setSearch({...search, minYear: e.target.value})}
                                />
                                <input 
                                    placeholder="Est. To..." 
                                    type="number"
                                    className="bg-black border border-neutral-700 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                                    value={search.maxYear}
                                    onChange={e => setSearch({...search, maxYear: e.target.value})}
                                />
                            </div>
                        )}
                    </div>

                    {/* Scrollable Results Area */}
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
                                        onLocate={handleLocate}
                                    />
                                );
                            })}
                        </div>
                        
                        {!isSearching && searchResults.length === 0 && (search.query || selectedArtist || search.minYear || search.maxYear) && (
                            <div className="text-center text-neutral-600 italic mt-8 text-sm">No results found.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeItem ? <AlbumCard item={activeItem} /> : null}
            </DragOverlay>

        </DndContext>
      </div>
    </div>
  );
}