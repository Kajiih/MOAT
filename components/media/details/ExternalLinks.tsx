/**
 * @file ExternalLinks.tsx
 * @description A reusable component for rendering a list of external resource links.
 * Automatically generates a MusicBrainz link based on the entity ID and type.
 * @module ExternalLinks
 */

import { ExternalLink } from 'lucide-react';

/**
 * Props for the ExternalLinks component.
 */
interface ExternalLinksProps {
  /** The MusicBrainz ID of the entity. */
  mbId: string;
  /** The type of media entity. */
  type: 'album' | 'artist' | 'song';
  /** Optional array of additional external URLs from the metadata. */
  urls?: { type: string; url: string }[];
}

/**
 * Renders a collection of external links for a media item, always including its MusicBrainz profile.
 * @param props - The props for the component.
 * @param props.mbId - The MusicBrainz ID of the entity.
 * @param props.type - The type of media entity.
 * @param props.urls - Optional array of additional external URLs from the metadata.
 */
export function ExternalLinks({ mbId, type, urls }: ExternalLinksProps) {
  const mbType = type === 'album' ? 'release-group' : type === 'song' ? 'recording' : 'artist';
  const musicBrainzUrl = `https://musicbrainz.org/${mbType}/${mbId}`;

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-bold text-neutral-500 uppercase">Links</h3>
      <div className="flex flex-wrap gap-3">
        <a
          href={musicBrainzUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
        >
          <ExternalLink size={12} />
          <span>MusicBrainz</span>
        </a>

        {urls &&
          urls.length > 0 &&
          urls.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
            >
              <ExternalLink size={12} />
              <span className="capitalize">{link.type}</span>
            </a>
          ))}
      </div>
    </div>
  );
}
