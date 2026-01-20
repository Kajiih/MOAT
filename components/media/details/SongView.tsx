/**
 * @file SongView.tsx
 * @description Renders the detailed view for a Song (Recording) entity within the Details Modal.
 * Displays metadata (Duration), parent Album info, Tags, and external links.
 * @module SongView
 */

import { Clock, Disc, ExternalLink } from 'lucide-react';

import { MediaDetails } from '@/lib/types';

import { ExternalLinks } from './ExternalLinks';

/**
 * Props for the SongView component.
 */
interface SongViewProps {
  /** The detailed metadata for the song. */
  details: MediaDetails;
}

/**
 * Renders the detailed metadata and parent album information for a song.
 * @param props - The props for the component.
 * @param props.details - The detailed metadata for the song.
 * @returns The rendered SongView component.
 */
export function SongView({ details }: SongViewProps) {
  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-6 duration-300">
      {/* Metadata */}
      {details.length && (
        <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
          <div className="flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1.5">
            <Clock size={14} className="text-green-400" />
            <span>{details.length}</span>
          </div>
        </div>
      )}

      {/* Album Info */}
      {details.album && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-800/50 p-3 text-sm text-neutral-300">
          <Disc size={16} className="text-blue-400" />
          <span className="flex flex-wrap items-center gap-1.5">
            From album:
            {details.albumId ? (
              <a
                href={`https://musicbrainz.org/release-group/${details.albumId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1 font-bold text-white transition-colors hover:text-blue-400"
                title="View album on MusicBrainz"
              >
                {details.album}
                <ExternalLink
                  size={12}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                />
              </a>
            ) : (
              <strong className="text-white">{details.album}</strong>
            )}
          </span>
        </div>
      )}

      {/* Tags */}
      {details.tags && details.tags.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-neutral-500 uppercase">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {details.tags.map((tag) => (
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

      <ExternalLinks mbId={details.id} type="song" urls={details.urls} />
    </div>
  );
}
