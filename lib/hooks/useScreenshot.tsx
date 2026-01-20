/**
 * @file useScreenshot.ts
 * @description Custom hook for generating high-quality PNG screenshots of DOM elements.
 * Uses `html-to-image` to render the view and `downloadjs` to trigger the file download.
 * Handles cache-busting strategies to ensure images render correctly (avoiding CORS/caching issues).
 * @module useScreenshot
 */

'use client';

import download from 'downloadjs';
import { toPng } from 'html-to-image';
import { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { ExportBoard } from '@/components/board/ExportBoard';
import { useToast } from '@/components/ui/ToastProvider';
import { failedImages } from '@/lib/image-cache';
import { TierListState } from '@/lib/types';

/**
 * Custom hook to capture a high-quality screenshot of the tier list.
 * Uses a "Clean Room" approach: renders the board into a hidden DOM node to avoid
 * issues with interactive elements, next/image serialization, and CSS race conditions.
 */
/**
 * Helper to convert an image URL to a Data URL
 * This allows us to "hardcode" images into the DOM before capture,
 * preventing various html-to-image duplication and hang bugs.
 * @param url - The original image URL (external or local).
 * @returns A Promise resolving to a Base64 Data URL, or null if resolution fails.
 */
async function resolveImageDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  // Check if this image is already known to be broken in the app
  const isKnownBroken = failedImages.has(url);

  /**
   * Internal fetcher with error handling
   * @param target - The URL to fetch.
   * @returns A Promise resolving to a Base64 Data URL.
   */
  const fetchAsDataUrl = async (target: string) => {
    const resp = await fetch(target);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const blob = await resp.blob();
    if (blob.size === 0) throw new Error('Empty response');
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileRead failed'));
      reader.readAsDataURL(blob);
    });
  };

  try {
    const isExternal =
      url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1');

    if (isExternal) {
      try {
        // Attempt 1: Custom Proxy (CORS-safe, no optimization validation)
        // We use our own proxy because /_next/image can be strict about domains/formats
        // and return 400s for valid images (e.g. from fanart.tv).
        const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        return await fetchAsDataUrl(proxiedUrl);
      } catch (proxyError) {
        if (!isKnownBroken) {
          console.warn(
            `Screenshot Engine: Proxy failed for ${url}. Switching to direct fetch.`,
            proxyError,
          );
        }
        // Attempt 2: Direct Fetch (Works if CDN has CORS headers, e.g. coverartarchive)
        return await fetchAsDataUrl(url);
      }
    } else {
      // Local URL, fetch directly
      return await fetchAsDataUrl(url);
    }
  } catch (error) {
    // Differentiate between expected and unexpected failures
    if (isKnownBroken) {
      // Expected failure - image was already broken in the app
      console.warn(`Screenshot Engine: Skipping known broken image: ${url}`);
    } else {
      // Unexpected failure - image was working in the app but failed during screenshot
      console.error(`Screenshot Engine: Unexpected failure resolving ${url}:`, error);
    }
    return null;
  }
}

/**
 * Custom hook to manage the screenshot capture process.
 * @param fileName - The default filename for the downloaded PNG.
 * @returns Object containing:
 * - `takeScreenshot`: Function to trigger the capture.
 * - `isCapturing`: Loading state during resolution and rendering.
 */
export function useScreenshot(fileName: string = 'tierlist.png') {
  const [isCapturing, setIsCapturing] = useState(false);
  const { showToast } = useToast();

  /**
   * Captures the current board state as a high-quality PNG.
   * @param state - The current TierListState to render.
   * @param headerColors - The palette to use for branding elements.
   */
  const takeScreenshot = useCallback(
    async (state: TierListState, headerColors: string[]) => {
      setIsCapturing(true);

      // 1. Resolve all images to Data URLs BEFORE any DOM operations
      const uniqueUrls = [
        ...new Set(
          Object.values(state.items)
            .flat()
            .flatMap((item) => (item.imageUrl ? [item.imageUrl] : [])),
        ),
      ];

      console.log(`Screenshot Engine: Resolving ${uniqueUrls.length} unique images...`);
      const resolvedMap: Record<string, string> = {};

      await Promise.all(
        uniqueUrls.map(async (url: string) => {
          const dataUrl = await resolveImageDataUrl(url);
          if (dataUrl) {
            resolvedMap[url] = dataUrl;
          }
        }),
      );

      const resolvedCount = Object.keys(resolvedMap).length;
      console.log(
        `Screenshot Engine: Successfully resolved ${resolvedCount}/${uniqueUrls.length} images.`,
      );

      // 2. Create the hidden container
      const container = document.createElement('div');
      // Copy body classes to ensure font variables and global styles are inherited
      container.className = document.body.className;
      container.style.position = 'absolute';
      container.style.left = '-10000px';
      container.style.top = '10000px';
      container.style.width = '1200px';
      container.style.zIndex = '-9999';
      container.style.visibility = 'visible';
      container.style.opacity = '1';
      container.style.pointerEvents = 'none';
      document.body.append(container);

      const root = createRoot(container);

      try {
        // 3. Render with resolved images
        root.render(
          <ExportBoard state={state} brandColors={headerColors} resolvedImages={resolvedMap} />,
        );

        // 4. Wait for React and styles to stabilize
        // Generous timeout for complex layouts
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const boardElement = container.querySelector('#export-board-surface') as HTMLElement;
        if (!boardElement) {
          throw new Error('ExportBoard failed to render into the offscreen container.');
        }

        // Force a reflow to ensure height is calculated
        const _height = boardElement.scrollHeight;
        console.log(`Screenshot Engine: Board measured at ${_height}px.`);

        // 5. Final Paint Sync
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise((resolve) => setTimeout(resolve, 200));

        // 6. Capture the PNG
        const dataUrl = await toPng(boardElement, {
          backgroundColor: '#0a0a0a',
          pixelRatio: 2,
          width: 1200,
          height: _height,
          cacheBust: true,
          style: {
            position: 'relative',
            left: '0',
            top: '0',
            visibility: 'visible',
            opacity: '1',
            margin: '0',
            padding: '0',
            display: 'flex',
            flexDirection: 'column',
          },
        });

        const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, 19);
        const name = fileName.replace('.png', `-${timestamp}.png`);

        download(dataUrl, name);
        showToast('Screenshot saved!', 'success');
      } catch (error) {
        // Improved error reporting
        console.error('Screenshot raw error:', error);
        let errorMessage;

        if (error instanceof Error) {
          errorMessage = `${error.message}\n${error.stack}`;
        } else if (error instanceof Event) {
          const target = error.target as HTMLElement | null;
          errorMessage = `Capture failed due to a browser event [${error.type}] on ${target?.tagName || 'unknown'}${target instanceof HTMLImageElement ? ' (' + target.src + ')' : ''}. This usually happens when an image fails to load or violates CORS.`;
        } else if (typeof error === 'object' && error !== null) {
          errorMessage = JSON.stringify(error);
        } else {
          errorMessage = String(error);
        }

        console.error('Screenshot failed diagnostic:', errorMessage);
        showToast('Failed to save screenshot', 'error');
      } finally {
        // 5. Cleanup
        setIsCapturing(false);

        // Immediate unmount and removal to avoid side effects
        try {
          root.unmount();
        } catch (error) {
          console.warn('Unmount error during cleanup', error);
        }
        if (document.body.contains(container)) {
          container.remove();
        }
      }
    },
    [fileName, showToast],
  );

  return { takeScreenshot, isCapturing };
}
