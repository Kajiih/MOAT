/**
 * @file ArtistView.tsx
 * @description Renders the detailed view for an Artist entity within the Details Modal.
 * Displays metadata (Origin/Area), popular Tags, and external links.
 * @module ArtistView
 */

import { MapPin } from 'lucide-react';
import { MediaDetails } from '@/lib/types';
import { ExternalLinks } from './ExternalLinks';

interface ArtistViewProps {
  details: MediaDetails;
}

export function ArtistView({ details }: ArtistViewProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
            {details.area && (
                <div className="flex items-center gap-1.5 bg-neutral-800 px-3 py-1.5 rounded-full">
                    <MapPin size={14} /> 
                    <span>{details.area}</span>
                </div>
            )}
        </div>

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

        <ExternalLinks mbId={details.id} type="artist" urls={details.urls} />
    </div>
  );
}
