/**
 * @file ExternalLinks.tsx
 * @description A reusable component for rendering a list of external resource links.
 * Automatically generates a MusicBrainz link based on the entity ID and type.
 * @module ExternalLinks
 */

import { ExternalLink } from 'lucide-react';

interface ExternalLinksProps {
  mbId: string;
  type: 'album' | 'artist' | 'song';
  urls?: { type: string; url: string }[];
}

export function ExternalLinks({ mbId, type, urls }: ExternalLinksProps) {
  const mbType = type === 'album' ? 'release-group' : type === 'song' ? 'recording' : 'artist';
  const musicBrainzUrl = `https://musicbrainz.org/${mbType}/${mbId}`;

  return (
    <div className="mt-6">
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
            
            {urls && urls.length > 0 && urls.map((link) => (
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
  );
}
