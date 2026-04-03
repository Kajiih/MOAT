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
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { useToast } from '@/core/ui/ToastProvider';
import { ImageSource } from '@/domain/items/images';
import { TierListContext, TierListContextType } from '@/features/board/context';
import { ExportBoard } from '@/features/board/ExportBoard';
import { TierListState } from '@/features/board/types';
import { failedImages } from '@/features/items/image-cache';
import { logger } from '@/infra/logger';

/**
 * ScreenshotContext: stores pre-resolved Data URLs for instantaneous rendering offscreen.
 * Key: stable string representing the source (url or stringified reference)
 * Value: data:image/jpeg;base64,...
 */
const ScreenshotContext = createContext<Record<string, string>>({});

const SCREENSHOT_TIMEOUTS = {
  RENDER: 5000,
  IMAGE_LOAD: 5000,
  FONT_LOAD: 2000,
  CAPTURE: 15_000,
};

function waitForImageLoad(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve();
  return Promise.race([
    new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    }),
    new Promise<void>((resolve) => setTimeout(resolve, SCREENSHOT_TIMEOUTS.IMAGE_LOAD)),
  ]);
}

/**
 * Provider component for the ScreenshotContext.
 * @param props - Component configuration settings.
 * @param props.children - Child nodes to render.
 * @param props.resolvedMap - Pre-resolved image hashmap.
 * @returns The rendered provider element.
 */
export const ScreenshotProvider = ({
  children,
  resolvedMap,
}: {
  children: ReactNode;
  resolvedMap: Record<string, string>;
}) => <ScreenshotContext.Provider value={resolvedMap}>{children}</ScreenshotContext.Provider>;

export const useScreenshotContext = () => useContext(ScreenshotContext);

/**
 * Internal fetcher with error handling.
 * @param target - URL or Data URL source to render.
 * @returns Base64 encoded string response.
 */
async function fetchAsDataUrl(target: string): Promise<string> {
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
}

function buildProxyUrl(source: ImageSource): { proxiedUrl: string; cacheKeyUrl: string } {
  let proxiedUrl = '';
  let cacheKeyUrl = '';

  if (source.type === 'url') {
    proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(source.url)}`;
    cacheKeyUrl = source.url;
  } else {
    proxiedUrl = `/api/proxy-image?providerId=${encodeURIComponent(source.provider)}&entityId=${encodeURIComponent(source.entityId)}&key=${encodeURIComponent(source.key)}`;
  }
  return { proxiedUrl, cacheKeyUrl };
}

function buildAttempts(
  source: ImageSource,
  isExternal: boolean,
  proxiedUrl: string,
): Array<() => Promise<string>> {
  const attempts: Array<() => Promise<string>> = [];
  if (isExternal) {
    attempts.push(() => fetchAsDataUrl(proxiedUrl));
  }
  if (source.type === 'url') {
    attempts.push(() => fetchAsDataUrl(source.url));
  }
  return attempts;
}

/**
 * Helper to convert an ImageSource to a Data URL
 * This allows us to "hardcode" images into the DOM before capture,
 * preventing various html-to-image duplication and hang bugs.
 * @param source - The ImageSource object (url or reference).
 * @returns A Promise resolving to a Base64 Data URL, or null if resolution fails.
 */
async function resolveImageDataUrl(source: ImageSource): Promise<string | null> {
  if (!source) return null;

  if (source.type === 'url' && source.url.startsWith('data:')) return source.url;
  const { proxiedUrl, cacheKeyUrl } = buildProxyUrl(source);

  const isKnownBroken = cacheKeyUrl ? failedImages.has(cacheKeyUrl) : false;

  const isExternal =
    source.type === 'reference' ||
    (source.type === 'url' &&
      source.url.startsWith('http') &&
      !source.url.includes('localhost') &&
      !source.url.includes('127.0.0.1'));

  const attempts = buildAttempts(source, isExternal, proxiedUrl);

  for (const execute of attempts) {
    try {
      const result = await execute();
      if (result) return result;
    } catch (error) {
      if (!isKnownBroken) {
        logger.warn({ error, source }, 'Screenshot Engine: Attempt failed, falling back.');
      }
    }
  }

  if (source.type === 'url' && !isKnownBroken) {
    logger.error({ source }, 'Screenshot Engine: All resolution attempts failed.');
    failedImages.add(source.url);
  }

  return null;
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
      const candidateSources = Object.values(state.itemEntities)
        .map((item) => item.images?.[0])
        .filter((source): source is ImageSource => !!source);

      // Deduplicate by URL or stringified Reference definition
      const uniqueSourcesMap = new Map<string, ImageSource>();
      for (const source of candidateSources) {
        const key = source.type === 'url' ? source.url : JSON.stringify(source);
        if (!uniqueSourcesMap.has(key)) {
          uniqueSourcesMap.set(key, source);
        }
      }

      const uniqueSources = [...uniqueSourcesMap.values()];

      logger.info(`Screenshot Engine: Resolving ${uniqueSources.length} unique images...`);
      const resolvedMap: Record<string, string> = {};

      await Promise.all(
        uniqueSources.map(async (source: ImageSource) => {
          const dataUrl = await resolveImageDataUrl(source);
          if (dataUrl) {
            const key = source.type === 'url' ? source.url : JSON.stringify(source);
            resolvedMap[key] = dataUrl;
          }
        }),
      );

      const resolvedCount = Object.keys(resolvedMap).length;
      logger.info(
        `Screenshot Engine: Successfully resolved ${resolvedCount}/${uniqueSources.length} images.`,
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
          <ScreenshotProvider resolvedMap={resolvedMap}>
            <TierListContext.Provider value={{ ui: { activeEpic: null }, isHydrated: true } as unknown as TierListContextType}>
              <ExportBoard state={state} brandColors={headerColors} />
            </TierListContext.Provider>
          </ScreenshotProvider>,
        );

        // 4. Wait for React to finish asynchronous mounting (with a 5s timeout fallback)
        await Promise.race([
          new Promise<void>((resolve) => {
            if (container.childElementCount > 0) {
              resolve();
            } else {
              const observer = new MutationObserver(() => {
                if (container.childElementCount > 0) {
                  observer.disconnect();
                  resolve();
                }
              });
              observer.observe(container, { childList: true });
            }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Render timeout')), SCREENSHOT_TIMEOUTS.RENDER)),
        ]);

        // Yield to the browser's reflow/paint cycle to ensure CSS OM calculates bounding boxes
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Ensure all rendered images are fully loaded and decoded (with a 5s timeout fallback per image)
        const renderedImages = [...container.querySelectorAll('img')];
        await Promise.all(renderedImages.map((img) => waitForImageLoad(img)));

        // Ensure web fonts are completely loaded (with a 2s timeout fallback to prevent CI hangs)
        if (document.fonts) {
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, SCREENSHOT_TIMEOUTS.FONT_LOAD)),
          ]);
        }

        const boardElement = container.querySelector('#export-board-surface') as HTMLElement;
        if (!boardElement) {
          throw new Error('ExportBoard failed to render into the offscreen container.');
        }

        // Force a reflow to ensure height is calculated
        const _height = boardElement.scrollHeight;
        logger.info(`Screenshot Engine: Board measured at ${_height}px.`);

        // 5. Final Paint Sync
        // Yield to the browser's paint cycle deterministically
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        // 6. Capture the PNG (with a 15s timeout fallback)
        const dataUrl = await Promise.race([
          toPng(boardElement, {
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
          }),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('html-to-image capture timeout')), SCREENSHOT_TIMEOUTS.CAPTURE),
          ),
        ]);

        const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, 19);
        const name = fileName.replace('.png', `-${timestamp}.png`);

        download(dataUrl, name);
        showToast('Screenshot saved!', 'success');
      } catch (error) {
        // Improved error reporting
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error, errorMessage }, 'Screenshot Engine: Error captured during capture');
        showToast('Failed to save screenshot', 'error');
      } finally {
        // 5. Cleanup
        setIsCapturing(false);

        // Immediate unmount and removal to avoid side effects
        try {
          root.unmount();
        } catch (error) {
          logger.warn({ error }, 'Unmount error during cleanup');
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
