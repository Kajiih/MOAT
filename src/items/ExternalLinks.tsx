/**
 * @file ExternalLinks.tsx
 * @description A reusable component for rendering a list of external resource links.
 */

import { ExternalLink } from 'lucide-react';

/**
 * Props for the ExternalLinks component.
 */
interface ExternalLinksProps {
  /** Optional array of external URLs. */
  urls?: { type: string; url: string }[];
}

/**
 * Renders a collection of external links for an item.
 * @param root0
 * @param root0.urls
 */
export function ExternalLinks({ urls }: ExternalLinksProps) {
  if (!urls || urls.length === 0) return null;

  // Filter out duplicates based on URL
  const uniqueUrls = [...new Map(urls.map((link) => [link.url, link])).values()];

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-bold text-neutral-500 uppercase tracking-wider">Links</h3>
      <div className="flex flex-wrap gap-3">
        {uniqueUrls.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white border border-white/5"
          >
            <ExternalLink size={12} />
            <span className="capitalize">{link.type}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
