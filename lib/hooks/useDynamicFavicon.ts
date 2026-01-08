import { useEffect } from 'react';
import { getColorTheme } from '@/lib/colors';

/**
 * Generates an SVG data URI for the favicon based on the provided colors.
 */
function generateFaviconSvg(colors: string[]): string {
  // Ensure we have at least 3 colors for the bars, or fallback to defaults
  const c1 = colors[0] ? getColorTheme(colors[0]).hex : '#ef4444'; // Red default
  const c2 = colors[1] ? getColorTheme(colors[1]).hex : '#f59e0b'; // Orange default
  const c3 = colors[2] ? getColorTheme(colors[2]).hex : '#10b981'; // Green default

  const svg = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#171717"/>
  <rect x="6" y="8" width="20" height="4" rx="2" fill="${c1}"/>
  <rect x="6" y="14" width="20" height="4" rx="2" fill="${c2}"/>
  <rect x="6" y="20" width="20" height="4" rx="2" fill="${c3}"/>
</svg>`.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Dynamically updates the document favicon based on the tier list colors.
 * @param colors Array of color IDs (e.g. ['red', 'blue'])
 */
export function useDynamicFavicon(colors: string[]) {
  useEffect(() => {
    const svgDataUri = generateFaviconSvg(colors);
    
    // 1. Find or create our dynamic link
    let link = document.querySelector("link#dynamic-favicon") as HTMLLinkElement;

    if (!link) {
        link = document.createElement('link');
        link.id = 'dynamic-favicon';
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        document.head.appendChild(link);
    }

    // 2. Aggressively remove any other icon links to ensure our dynamic one has priority.
    // We do this every time because Next.js or HMR might re-inject static icons.
    const allIcons = document.querySelectorAll("link[rel*='icon']");
    allIcons.forEach(icon => {
        if (icon !== link) icon.remove();
    });

    // 3. Update the href
    link.href = svgDataUri;

  }, [colors]);
}
