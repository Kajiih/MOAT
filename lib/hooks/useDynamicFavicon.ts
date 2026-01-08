import { useEffect, useRef } from 'react';
import { useBrandColors } from './useBrandColors';


/**
 * Generates an SVG data URI for the favicon based on the provided colors.
 */
function generateFaviconSvg(hexColors: string[]): string {
  // Use the first 3 colors from the brand palette
  const c1 = hexColors[0];
  const c2 = hexColors[2];
  const c3 = hexColors[3];

  const svg = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#171717"/>
  <rect x="6" y="8" width="20" height="4" rx="2" fill="${c1}"/>
  <rect x="6" y="14" width="20" height="4" rx="2" fill="${c2}"/>
  <rect x="6" y="20" width="20" height="4" rx="2" fill="${c3}"/>
</svg>`.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export const SAFE_ZONE_DELAY = 100;
export const INITIAL_LOAD_DELAY = 1;


/**
 * Helper to update the DOM with the new favicon.
 * Encapsulates all direct DOM manipulation.
 */
export function applyFaviconToDom(svgDataUri: string) {
    let link = document.querySelector("link#dynamic-favicon") as HTMLLinkElement;

    if (!link) {
        link = document.createElement('link');
        link.id = 'dynamic-favicon';
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        document.head.appendChild(link);
    }

    const allIcons = document.querySelectorAll("link[rel*='icon']");
    allIcons.forEach(icon => {
        if (icon !== link) icon.remove();
    });

    link.href = svgDataUri;
}

/**
 * Dynamically updates the document favicon based on the tier list colors.
 * @param colors Array of color IDs (e.g. ['red', 'blue'])
 */
export function useDynamicFavicon(colors: string[]) {
  const initialLoadComplete = useRef(false);
  
  // Use shared brand logic to get consistent hex colors (handling defaults/fallbacks)
  const brandColors = useBrandColors(colors);

  // 1. Establish a "safe zone" after the page has definitely settled.
  useEffect(() => {
    const t = setTimeout(() => {
      initialLoadComplete.current = true;
    }, SAFE_ZONE_DELAY);
    return () => clearTimeout(t);
  }, []);

  // 2. Respond to color changes
  useEffect(() => {
    const svgDataUri = generateFaviconSvg(brandColors);
    
    // Encapsulate the "what" (update DOM) so the hook only manages the "when" (timing)
    const update = () => applyFaviconToDom(svgDataUri);

    if (!initialLoadComplete.current) {
        // Initial load / Hydration phase: Delegate to a timeout to ensure we override Next.js
        const timeoutId = setTimeout(update, INITIAL_LOAD_DELAY);
        return () => clearTimeout(timeoutId);
    } else {
        // Interactive phase: Update immediately
        update();
    }

  }, [brandColors]);
}
