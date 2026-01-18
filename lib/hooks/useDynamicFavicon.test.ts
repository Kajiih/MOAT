import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyFaviconToDom, useDynamicFavicon } from './useDynamicFavicon';

describe('useDynamicFavicon', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.head.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.head.innerHTML = '';
  });

  it('should create favicon on initial load', () => {
    renderHook(() => useDynamicFavicon(['red']));
    const link = document.querySelector('link#dynamic-favicon') as HTMLLinkElement;
    expect(link).not.toBeNull();
    expect(link.rel).toBe('icon');
    expect(link.href).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('should update when colors change', () => {
    const { rerender } = renderHook(({ colors }) => useDynamicFavicon(colors), {
      initialProps: { colors: ['red'] },
    });
    const link = document.querySelector('link#dynamic-favicon') as HTMLLinkElement;
    const firstHref = link.href;

    rerender({ colors: ['blue'] });
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
});
