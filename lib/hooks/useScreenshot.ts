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

  const takeScreenshot = useCallback(async () => {
    if (!ref.current) return;
    
    setIsCapturing(true);
    try {
      // 1. Force explicit dimensions to ensure full capture if within scroll container
      // (Though html-to-image usually handles this, sometimes explicit helps)
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        backgroundColor: '#0a0a0a', // neutral-950 hex
        pixelRatio: 2, // Retain high quality
        filter: (node) => !(node as HTMLElement).classList?.contains('screenshot-exclude')
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
