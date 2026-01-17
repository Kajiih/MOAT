import { renderHook, act } from '@testing-library/react';
import {
  useDynamicFavicon,
  applyFaviconToDom,
  SAFE_ZONE_DELAY,
  INITIAL_LOAD_DELAY,
} from './useDynamicFavicon';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('useDynamicFavicon', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.head.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.head.innerHTML = '';
  });

  it('should DELAY creation of favicon on initial load (Unsafe Zone)', () => {
    renderHook(() => useDynamicFavicon(['red']));

    // Should NOT exist immediately
    expect(document.querySelector('link#dynamic-favicon')).toBeNull();

    // Advance time by Initial Delay
    act(() => {
      vi.advanceTimersByTime(INITIAL_LOAD_DELAY);
    });

    // Should exist now
    const link = document.querySelector('link#dynamic-favicon') as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link.rel).toBe('icon');
    expect(link.href).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('should remove existing static icons after delay', () => {
    const staticIcon = document.createElement('link');
    staticIcon.rel = 'icon';
    staticIcon.href = '/favicon.ico';
    document.head.appendChild(staticIcon);

    renderHook(() => useDynamicFavicon(['red']));

    // Still there initially
    expect(document.querySelector('link[href="/favicon.ico"]')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(INITIAL_LOAD_DELAY);
    });

    // Gone after delay
    expect(document.querySelector('link[href="/favicon.ico"]')).toBeNull();
    expect(document.querySelector('link#dynamic-favicon')).not.toBeNull();
  });

  it('should update IMMEDIATELY when in Safe Zone', () => {
    const { rerender } = renderHook(({ colors }) => useDynamicFavicon(colors), {
      initialProps: { colors: ['red'] },
    });

    // 1. Wait for initial load to create the link
    act(() => {
      vi.advanceTimersByTime(INITIAL_LOAD_DELAY);
    });
    const link = document.querySelector('link#dynamic-favicon') as HTMLLinkElement;
    const firstHref = link.href;

    // 2. Wait for Safe Zone to be established
    // We need to advance by the difference to reach SAFE_ZONE_DELAY
    // Total passed so far: INITIAL_LOAD_DELAY.  Target: SAFE_ZONE_DELAY.
    // However, the Safe Zone effect starts at 0. So we just need to ensure total time passed > SAFE_ZONE_DELAY.
    act(() => {
      vi.advanceTimersByTime(SAFE_ZONE_DELAY);
    });

    // 3. Change colors
    rerender({ colors: ['blue'] });

    // 4. Should be updated IMMEDIATELY (no need to advance timers)
    expect(link.href).not.toBe(firstHref);
  });
});

describe('applyFaviconToDom', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('should create link if it does not exist', () => {
    applyFaviconToDom('data:image/svg+xml;base64,test');
    const link = document.querySelector('link#dynamic-favicon') as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link.href).toBe('data:image/svg+xml;base64,test');
  });

  it('should update href if link already exists', () => {
    // Setup existing
    const link = document.createElement('link');
    link.id = 'dynamic-favicon';
    link.rel = 'icon';
    link.href = 'old-href';
    document.head.appendChild(link);

    applyFaviconToDom('new-href');

    expect(link.href).toContain('new-href');
    // Should not create duplicate
    expect(document.querySelectorAll('link#dynamic-favicon').length).toBe(1);
  });

  it('should remove other icon links', () => {
    const other = document.createElement('link');
    other.rel = 'icon';
    other.href = 'other.ico';
    document.head.appendChild(other);

    applyFaviconToDom('data:test');

    expect(document.querySelector('link[href="other.ico"]')).toBeNull();
    expect(document.querySelector('link#dynamic-favicon')).not.toBeNull();
  });
});
