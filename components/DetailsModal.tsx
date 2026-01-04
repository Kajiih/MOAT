'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { MediaItem } from '@/lib/types';
import { useMediaDetails } from '@/lib/hooks';
import { AlbumView } from './details/AlbumView';
import { ArtistView } from './details/ArtistView';
import { SongView } from './details/SongView';

interface DetailsModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DetailsModal({ item, isOpen, onClose }: DetailsModalProps) {
  const [imageError, setImageError] = useState(false);

  const { details, isLoading, error } = useMediaDetails(
    isOpen && item ? item.id : null,
    isOpen && item ? item.type : null
  );

  // Reset image error state when the item changes
  useEffect(() => {
    if (item) {
      setImageError(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Cover Art */}
        <div className="relative h-48 sm:h-64 shrink-0 bg-neutral-950">
            {item.imageUrl && !imageError ? (
                <>
                    <Image 
                        src={item.imageUrl} 
                        alt={item.title} 
                        fill 
                        priority
                        className="object-cover opacity-60 blur-sm" 
                        onError={() => setImageError(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-6 flex gap-4 items-end w-full">
                        <div className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-lg overflow-hidden shadow-xl border-2 border-neutral-700">
                            <Image 
                                src={item.imageUrl} 
                                alt={item.title} 
                                fill 
                                priority
                                className="object-cover" 
                                onError={() => setImageError(true)}
                            />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1 flex items-center gap-1">
                                {item.type} 
                                {item.type === 'album' && item.primaryType && ` • ${item.primaryType}`}
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight truncate" title={item.title}>
                                {item.title}
                            </h2>
                            <p className="text-lg text-neutral-300 font-medium truncate">
                                {item.type === 'album' || item.type === 'song' ? item.artist : (item.disambiguation || '')}
                            </p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-800 p-6 text-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">{item.type}</div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight" title={item.title}>
                        {item.title}
                    </h2>
                    <p className="text-lg text-neutral-300 font-medium">
                        {item.type === 'album' || item.type === 'song' ? item.artist : (item.disambiguation || '')}
                    </p>
                </div>
            )}
            
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-10"
            >
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            {/* Loading State */}
            {isLoading && (
                <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-neutral-800 rounded w-1/3"></div>
                    <div className="space-y-2">
                        <div className="h-10 bg-neutral-800 rounded w-full"></div>
                        <div className="h-10 bg-neutral-800 rounded w-full"></div>
                        <div className="h-10 bg-neutral-800 rounded w-full"></div>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="text-red-400 bg-red-900/10 p-4 rounded border border-red-900/20 text-center">
                    Failed to load additional details.
                </div>
            )}

            {/* Data Display */}
            {details && !isLoading && (
                <>
                    {details.type === 'album' && <AlbumView details={details} />}
                    {details.type === 'artist' && <ArtistView details={details} />}
                    {details.type === 'song' && <SongView details={details} />}
                </>
            )}
        </div>
      </div>
    </div>
  );
}