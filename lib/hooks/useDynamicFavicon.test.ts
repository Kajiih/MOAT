import { renderHook } from '@testing-library/react';
import { useDynamicFavicon } from './useDynamicFavicon';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useDynamicFavicon', () => {
  // Clean up head after each test to ensure isolation
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('should create a new dynamic favicon link if none exists', () => {
    // 1. Ensure clean slate
    expect(document.querySelector('link#dynamic-favicon')).toBeNull();

    // 2. Render hook with some colors
    renderHook(() => useDynamicFavicon(['red', 'blue', 'green']));

    // 3. Verify link creation
    const link = document.querySelector('link#dynamic-favicon') as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link.rel).toBe('icon');
    expect(link.type).toBe('image/svg+xml');
    
    // Check if href is a data URI
    expect(link.href).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('should remove existing static icons', () => {
    // 1. Setup static icon
    const staticIcon = document.createElement('link');
    staticIcon.rel = 'icon';
    staticIcon.href = '/favicon.ico';
    document.head.appendChild(staticIcon);

    // 2. Render hook
    renderHook(() => useDynamicFavicon(['red']));

    // 3. Verify removal
    expect(document.querySelector('link[href="/favicon.ico"]')).toBeNull();
    expect(document.querySelector('link#dynamic-favicon')).not.toBeNull();
  });

  it('should update the favicon when colors change', () => {
    // 1. Render initial colors
    const { rerender } = renderHook(({ colors }) => useDynamicFavicon(colors), {
      initialProps: { colors: ['red'] }
    });

    const link = document.querySelector('link#dynamic-favicon') as HTMLLinkElement;
    const firstHref = link.href;

    // 2. Rerender with different colors
    rerender({ colors: ['blue'] });

    const secondHref = link.href;

    // 3. Verify change
    expect(secondHref).not.toBe(firstHref);
  });

  it('should handle missing or invalid colors gracefully', () => {
    // Should not throw
    renderHook(() => useDynamicFavicon([]));
    
    const link = document.querySelector('link#dynamic-favicon') as HTMLLinkElement;
    expect(link).not.toBeNull();
    // Verify it generated something (defaults handled inside generateFaviconSvg)
    expect(link.href).toContain('data:image/svg+xml');
  });
});
