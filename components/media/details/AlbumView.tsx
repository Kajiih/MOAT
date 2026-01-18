/**
 * @file AlbumView.tsx
 * @description Renders the detailed view for an Album entity within the Details Modal.
 * Displays metadata (Release Date, Label), the full Tracklist, and external links.
 * @module AlbumView
 */

import { Calendar, Disc, ExternalLink } from 'lucide-react';

import { MediaDetails } from '@/lib/types';

import { ExternalLinks } from './ExternalLinks';

/**
 * Props for the AlbumView component.
 */
interface AlbumViewProps {
  /** The detailed metadata for the album. */
  details: MediaDetails;
}

/**
 * Renders the detailed metadata and tracklist for an album.
 */
export function AlbumView({ details }: AlbumViewProps) {
  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-6 duration-300">
      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
        {details.date && (
          <div className="flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1.5">
            <Calendar size={14} className="text-orange-400" />
            <span>{details.date}</span>
          </div>
        )}
        {details.label && (
          <div className="flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1.5">
            <Disc size={14} className="text-blue-400" />
            <span>{details.label}</span>
          </div>
        )}
      </div>

      {/* Tracklist */}
      {details.tracks && details.tracks.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
            <Disc size={18} className="text-blue-500" />
            {details.releaseId ? (
              <a
                href={`https://musicbrainz.org/release/${details.releaseId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1.5 transition-colors hover:text-blue-400"
                title="View specific release on MusicBrainz"
              >
                Tracklist
                <ExternalLink
                  size={14}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                />
              </a>
            ) : (
              'Tracklist'
            )}
          </h3>
          <div className="divide-y divide-neutral-800 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-800/30">
            {details.tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center px-4 py-3 transition-colors hover:bg-neutral-800/50"
              >
                <span className="w-8 font-mono text-xs text-neutral-500">{track.position}</span>
                <a
                  href={`https://musicbrainz.org/recording/${track.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-sm font-medium text-neutral-200 transition-colors hover:text-blue-400"
                  title="View recording on MusicBrainz"
                >
                  {track.title}
                </a>
                <span className="ml-4 font-mono text-xs text-neutral-500">{track.length}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ExternalLinks mbId={details.id} type="album" urls={details.urls} />
    </div>
  );
}
