'use client';

import { X, ExternalLink, Disc, Calendar, MapPin } from 'lucide-react';
import Image from 'next/image';
import { MediaItem } from '@/lib/types';
import { useMediaDetails } from '@/lib/hooks';

interface DetailsModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DetailsModal({ item, isOpen, onClose }: DetailsModalProps) {
  const { details, isLoading, error } = useMediaDetails(
    isOpen && item ? item.id : null,
    isOpen && item ? item.type : null
  );

  if (!isOpen || !item) return null;

  const musicBrainzUrl = `https://musicbrainz.org/${
    item.type === 'album' ? 'release-group' : item.type === 'song' ? 'recording' : 'artist'
  }/${item.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Cover Art */}
        <div className="relative h-48 sm:h-64 shrink-0 bg-neutral-950">
            {item.imageUrl ? (
                <>
                    <Image 
                        src={item.imageUrl} 
                        alt={item.title} 
                        fill 
                        className="object-cover opacity-60 blur-sm" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-6 flex gap-4 items-end w-full">
                        <div className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-lg overflow-hidden shadow-xl border-2 border-neutral-700">
                            <Image 
                                src={item.imageUrl} 
                                alt={item.title} 
                                fill 
                                className="object-cover" 
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
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                    <span className="text-neutral-600 font-bold text-lg uppercase">{item.type}</span>
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
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                    
                    {/* Common Metadata */}
                    <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                        {details.date && (
                            <div className="flex items-center gap-1.5 bg-neutral-800 px-3 py-1.5 rounded-full">
                                <Calendar size={14} /> 
                                <span>{details.date}</span>
                            </div>
                        )}
                        {details.area && (
                            <div className="flex items-center gap-1.5 bg-neutral-800 px-3 py-1.5 rounded-full">
                                <MapPin size={14} /> 
                                <span>{details.area}</span>
                            </div>
                        )}
                        {details.label && (
                            <div className="flex items-center gap-1.5 bg-neutral-800 px-3 py-1.5 rounded-full">
                                <Disc size={14} /> 
                                <span>{details.label}</span>
                            </div>
                        )}
                    </div>

                    {/* Album Tracklist */}
                    {details.type === 'album' && details.tracks && details.tracks.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                <Disc size={18} className="text-blue-500" /> Tracklist
                            </h3>
                            <div className="bg-neutral-800/30 rounded-lg border border-neutral-800 overflow-hidden divide-y divide-neutral-800">
                                {details.tracks.map((track) => (
                                    <div key={track.id} className="flex items-center px-4 py-3 hover:bg-neutral-800/50 transition-colors">
                                        <span className="w-8 text-neutral-500 font-mono text-xs">{track.position}</span>
                                        <span className="flex-1 text-sm font-medium text-neutral-200">{track.title}</span>
                                        <span className="text-xs text-neutral-500 font-mono">{track.length}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    {details.tags && details.tags.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-neutral-500 uppercase mb-2">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {details.tags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-blue-900/20 text-blue-300 border border-blue-900/30 rounded text-xs">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* External Links */}
                    <div>
                        <h3 className="text-sm font-bold text-neutral-500 uppercase mb-2">Links</h3>
                        <div className="flex flex-wrap gap-3">
                            <a 
                                href={musicBrainzUrl}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded transition-colors"
                            >
                                <ExternalLink size={12} />
                                <span>MusicBrainz</span>
                            </a>
                            {details.urls && details.urls.length > 0 && details.urls.map((link) => (
                                <a 
                                    key={link.url} 
                                    href={link.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded transition-colors"
                                >
                                    <ExternalLink size={12} />
                                    <span className="capitalize">{link.type}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
