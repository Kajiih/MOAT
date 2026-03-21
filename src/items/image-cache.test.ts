import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We will import the class / singleton once built.
// For now, let's mock the global window/localStorage behavior.
describe('FailedImageCache', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
    });

    // We mock Date.now() to control TTL tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules(); // Force re-evaluating singleton exports between tests
  });

  it('should rehydrate from localStorage on initialization', async () => {
    const now = Date.now();
    mockStorage['moat_failed_images_v1'] = JSON.stringify({
      'https://example.com/image1.jpg': now,
      'https://example.com/image2.jpg': now - 5000,
    });

    // Dynamically import to trigger initialization
    const { failedImages } = await import('./image-cache');

    expect(failedImages.has('https://example.com/image1.jpg')).toBe(true);
    expect(failedImages.has('https://example.com/image2.jpg')).toBe(true);
    expect(failedImages.has('https://example.com/unknown.jpg')).toBe(false);
  });

  it('should prune expired items on initialization', async () => {
    const now = Date.now();
    const over24Hours = 24 * 60 * 60 * 1000 + 1000; // 24h + 1s

    mockStorage['moat_failed_images_v1'] = JSON.stringify({
      'https://example.com/fresh.jpg': now,
      'https://example.com/expired.jpg': now - over24Hours,
    });

    const { failedImages } = await import('./image-cache');

    expect(failedImages.has('https://example.com/fresh.jpg')).toBe(true);
    expect(failedImages.has('https://example.com/expired.jpg')).toBe(false);

    // Check that localStorage was updated to remove the expired item
    const saved = JSON.parse(mockStorage['moat_failed_images_v1']);
    expect(saved['https://example.com/fresh.jpg']).toBeDefined();
    expect(saved['https://example.com/expired.jpg']).toBeUndefined();
  });

  it('should add items and persist to localStorage', async () => {
    const { failedImages } = await import('./image-cache');

    failedImages.add('https://example.com/new-fail.jpg');

    expect(failedImages.has('https://example.com/new-fail.jpg')).toBe(true);

    const saved = JSON.parse(mockStorage['moat_failed_images_v1']);
    expect(saved['https://example.com/new-fail.jpg']).toBeDefined();
  });

  it('should evict the oldest entry when exceeding MAX_ENTRIES', async () => {
    const { failedImages } = await import('./image-cache');

    const MAX_ENTRIES = 1000;
    const now = Date.now();

    // Add 1000 items sequentially with increasing timestamps
    for (let i = 1; i <= MAX_ENTRIES; i++) {
      vi.setSystemTime(now + i);
      failedImages.add(`https://example.com/img-${i}.jpg`);
    }

    // Verify all 1000 exist
    expect(failedImages.has('https://example.com/img-1.jpg')).toBe(true);
    expect(failedImages.has(`https://example.com/img-${MAX_ENTRIES}.jpg`)).toBe(true);

    // Add the 1001st item
    vi.setSystemTime(now + MAX_ENTRIES + 1);
    failedImages.add('https://example.com/img-1001.jpg');

    // Item 1 (oldest) should be evicted
    expect(failedImages.has('https://example.com/img-1.jpg')).toBe(false);
    expect(failedImages.has('https://example.com/img-2.jpg')).toBe(true);
    expect(failedImages.has('https://example.com/img-1001.jpg')).toBe(true);

    const saved = JSON.parse(mockStorage['moat_failed_images_v1']);
    expect(Object.keys(saved).length).toBe(MAX_ENTRIES);
    expect(saved['https://example.com/img-1.jpg']).toBeUndefined();
  });

  it('should handle corrupt localStorage JSON gracefully', async () => {
    mockStorage['moat_failed_images_v1'] = 'corrupted-invalid-json';

    const { failedImages } = await import('./image-cache');

    expect(failedImages.has('https://example.com/anything.jpg')).toBe(false);

    // Should self-heal with a fresh append
    failedImages.add('https://example.com/fresh-start.jpg');
    expect(failedImages.has('https://example.com/fresh-start.jpg')).toBe(true);
  });
});
