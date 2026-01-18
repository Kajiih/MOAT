/**
 * @file useDynamicFavicon.ts
 * @description Hook to programmatically update the browser's favicon based on the tier list colors.
 * Generates an SVG on the fly and converts it to a Data URI.
 * Handles React hydration timing issues to ensure the favicon updates correctly on initial load.
 * @module useDynamicFavicon
 */

'use client';

import { useEffect } from 'react';

import { useBrandColors } from './useBrandColors';

/**
 * Generates an SVG data URI for the favicon based on the provided colors.
 */
function generateFaviconSvg(hexColors: (string | undefined)[]): string {
  // Map standard tier colors
  const c1 = hexColors[0]; // Top
  const c2 = hexColors[1]; // Middle Left
  const c3 = hexColors[2]; // Middle Right
  const c4 = hexColors[3]; // Bottom

  const svg = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#171717"/>
  ${c1 ? `<rect x="6" y="8" width="20" height="4" rx="2" fill="${c1}"/>` : ''}
  ${c2 ? `<rect x="6" y="14" width="9" height="4" rx="2" fill="${c2}"/>` : ''}
  ${c3 ? `<rect x="17" y="14" width="9" height="4" rx="2" fill="${c3}"/>` : ''}
  ${c4 ? `<rect x="6" y="20" width="20" height="4" rx="2" fill="${c4}"/>` : ''}
</svg>`.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Helper to update the DOM with the new favicon.
 * Encapsulates all direct DOM manipulation.
 */
export function applyFaviconToDom(svgDataUri: string) {
  let link = document.querySelector('link#dynamic-favicon') as HTMLLinkElement;

  if (!link) {
    link = document.createElement('link');
    link.id = 'dynamic-favicon';
    link.rel = 'icon';
    link.type = 'image/svg+xml';
  }

  // Always re-append to ensure it is the LAST element in <head>
  // Browsers typically prioritize the last icon declaration.
  // This avoids needing to delete other icons (which crashes Next.js).
  document.head.appendChild(link);

  link.href = svgDataUri;
}

/**
 * Dynamically updates the document favicon based on the tier list colors.
 * @param colors Array of color IDs (e.g. ['red', 'blue'])
 */
export function useDynamicFavicon(colors: string[]) {
  // Use shared brand logic to get consistent hex colors
  const brandColors = useBrandColors(colors);

  useEffect(() => {
    const svgDataUri = generateFaviconSvg(brandColors);
    applyFaviconToDom(svgDataUri);
  }, [brandColors]);
}
