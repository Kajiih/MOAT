/**
 * @file useScreenshot.ts
 * @description Custom hook for generating high-quality PNG screenshots of DOM elements.
 * Uses `html-to-image` to render the view and `downloadjs` to trigger the file download.
 * Handles cache-busting strategies to ensure images render correctly (avoiding CORS/caching issues).
 * @module useScreenshot
 */

import { useState, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { useToast } from '@/components/ToastProvider';

/**
 * Custom hook to capture a screenshot of a DOM element.
 */
export function useScreenshot(fileName: string = 'tierlist.png') {
  const ref = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { showToast } = useToast();

  /**
   * Captures the current content of the ref element.
   * - Sets background color to match the theme.
   * - Uses 2x pixel ratio for Retina-quality export.
   * - Excludes elements with class 'screenshot-exclude' (e.g. buttons).
   * - Appends a timestamp to the filename.
   */
  const takeScreenshot = useCallback(async () => {
    if (!ref.current) return;
    
    setIsCapturing(true);
    try {
      const dataUrl = await toPng(ref.current, {
        backgroundColor: '#0a0a0a', // neutral-950 hex
        pixelRatio: 2, // Retain high quality
        filter: (node) => !(node as HTMLElement).classList?.contains('screenshot-exclude'),
        // More robust cache busting to prevent identical images from rendering incorrectly.
        // By adding a unique timestamp, we force the browser to re-evaluate each image.
        fetchRequestInit: {
          headers: new Headers(),
          cache: 'no-cache'
        },
        cacheBust: true,
      });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const name = fileName.replace('.png', `-${timestamp}.png`);
      
      download(dataUrl, name);
      showToast("Screenshot saved!", "success");
    } catch (err) {
      console.error('Screenshot failed', err);
      showToast("Failed to save screenshot", "error");
    } finally {
      setIsCapturing(false);
    }
  }, [fileName, showToast]);

  return { ref, takeScreenshot, isCapturing };
}
