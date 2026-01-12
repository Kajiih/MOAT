/**
 * @file DetailsModal.tsx
 * @description A modal component for displaying detailed information about a media item.
 * It fetches deep metadata (tracklists, artist bios, etc.) on demand and displays it in a rich layout.
 * Also handles image error fallbacks and retries.
 * @module DetailsModal
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Disc, User, Music } from 'lucide-react';
import Image from 'next/image';
import { MediaItem } from '@/lib/types';
import { useMediaDetails } from '@/lib/hooks';
import { AlbumView } from './details/AlbumView';
import { ArtistView } from './details/ArtistView';
import { SongView } from './details/SongView';
import { useMediaRegistry } from './MediaRegistryProvider';

interface DetailsModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem?: (itemId: string, updates: Partial<MediaItem>) => void;
}

export function DetailsModal({ item, isOpen, onClose, onUpdateItem }: DetailsModalProps) {
  const [imageError, setImageError] = useState(false);
  const [retryUnoptimized, setRetryUnoptimized] = useState(false);

  const { getItem } = useMediaRegistry();

  // ENRICHMENT: Always prefer the version from the registry as it might have 
  // been "healed" by the bundler since this modal opened or the card rendered.
  const enrichedItem = useMemo(() => {
    if (!item) return null;
    const fromRegistry = getItem(item.id);
    if (!fromRegistry) return item;

    // Only create a new object if there's actually a difference in visual fields
    if (fromRegistry.imageUrl && !item.imageUrl) {
        return { ...item, imageUrl: fromRegistry.imageUrl };
    }
    return item;
  }, [item, getItem]);

  const { details, isLoading, isFetching, error } = useMediaDetails(
    isOpen && enrichedItem ? enrichedItem.id : null,
    isOpen && enrichedItem ? enrichedItem.type : null,
    enrichedItem?.details
  );

  // Commit fetched details to board state
  useEffect(() => {
    if (details && !isFetching && !error && enrichedItem && onUpdateItem) {
        onUpdateItem(enrichedItem.id, { 
            details, 
            imageUrl: details.imageUrl || enrichedItem.imageUrl
        });
    }
  }, [details, isFetching, error, enrichedItem, onUpdateItem]);

  if (!isOpen || !enrichedItem) return null;

  const hasImage = enrichedItem.imageUrl && !imageError;
  const PlaceholderIcon = enrichedItem.type === 'artist' ? User : enrichedItem.type === 'song' ? Music : Disc;

  const handleImageError = () => {
    if (!retryUnoptimized) {
        setRetryUnoptimized(true);
    } else {
        setImageError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Cover Art */}
        <div className="relative h-48 sm:h-64 shrink-0 bg-neutral-950 overflow-hidden">
            {hasImage ? (
                <>
                    <Image 
                        src={enrichedItem.imageUrl!} 
                        alt={enrichedItem.title} 
                        fill 
                        priority
                        unoptimized={retryUnoptimized}
                        className="object-cover opacity-60 blur-sm" 
                        onError={handleImageError}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/50 to-transparent" />
                </>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-800 to-neutral-900 opacity-50" />
            )}

            <div className="absolute bottom-0 left-0 p-6 w-full flex gap-4 items-end text-left">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded shadow-lg overflow-hidden bg-neutral-800 shrink-0 border border-white/10">
                        {hasImage ? (
                            <Image
                                src={enrichedItem.imageUrl!}
                                alt={enrichedItem.title}
                                fill
                                unoptimized={retryUnoptimized}
                                className="object-cover"
                                onError={() => {
                                    if (!retryUnoptimized) {
                                        setRetryUnoptimized(true);
                                    } else {
                                        setImageError(true);
                                    }
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                <PlaceholderIcon size={32} />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 pt-2">
                        <h2 className="text-2xl sm:text-3xl font-bold truncate text-white drop-shadow-sm">
                            {enrichedItem.title}
                        </h2>
                        <div className="flex items-center gap-2 text-neutral-300 mt-1">
                            {enrichedItem.type === 'album' && <Disc size={16} className="text-blue-400" />}
                            {enrichedItem.type === 'artist' && <User size={16} className="text-purple-400" />}
                            {enrichedItem.type === 'song' && <Music size={16} className="text-green-400" />}
                            <span className="font-medium">
                                {'artist' in enrichedItem ? enrichedItem.artist : 'Artist'}
                            </span>
                            {enrichedItem.year && (
                                <>
                                    <span className="text-neutral-600">•</span>
                                    <span className="text-neutral-400">{enrichedItem.year}</span>
                                </>
                            )}
                        </div>
                    </div>
            </div>
            
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
