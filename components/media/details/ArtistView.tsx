/**
 * @file ArtistView.tsx
 * @description Renders the detailed view for an Artist entity within the Details Modal.
 * Displays metadata (Origin/Area), popular Tags, and external links.
 * @module ArtistView
 */

import { MapPin } from 'lucide-react';

import { MediaDetails } from '@/lib/types';

/**
 * Props for the ArtistView component.
 */
interface ArtistViewProps {
  /** The detailed metadata for the artist. */
  details: MediaDetails;
}

/**
 * Renders the detailed metadata and tags for an artist.
 * @param props - The props for the component.
 * @param props.details - The detailed metadata for the artist.
 * @returns The rendered ArtistView component.
 */
export function ArtistView({ details }: ArtistViewProps) {
  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-6 duration-300">
      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
        {details.area && (
          <div className="flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1.5">
            <MapPin size={14} />
            <span>{details.area}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {details.tags && details.tags.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-neutral-500 uppercase">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(details.tags)).map((tag) => (
              <span
                key={tag}
                className="rounded border border-blue-900/30 bg-blue-900/20 px-2 py-1 text-xs text-blue-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
