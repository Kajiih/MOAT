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
 * Helper component to render external links beautifully.
 * @param props - The component properties.
 * @param props.urls - A map or list of external URLs.
 * @returns Rendered links mapped statically.
 */
export function ExternalLinks({ urls }: ExternalLinksProps) {
  if (!urls || urls.length === 0) return null;

  // Filter out duplicates based on URL
  const uniqueUrls = [...new Map(urls.map((link) => [link.url, link])).values()];

  return (
    <div className="flex flex-wrap gap-1.5">
      {uniqueUrls.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary/90 flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.03] px-2.5 py-1 text-caption transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ExternalLink size={11} />
          <span className="capitalize">{link.type}</span>
        </a>
      ))}
    </div>
  );
}
