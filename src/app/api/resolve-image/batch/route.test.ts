import { NextRequest } from 'next/server';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { registry } from '@/providers/registry';

import { POST } from './route';

vi.mock('@/providers/registry', () => {
  return {
    registry: {
      waitUntilReady: vi.fn().mockResolvedValue(undefined),
      resolveImageReference: vi.fn(),
      register: vi.fn(), // Add this to prevent crash on bootstrap
    },
  };
});

describe('Batch Resolve Image API - Timeouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve fast items and set null for items that time out', async () => {
    // 1. Mock registry behavior
    registry.resolveImageReference = vi.fn().mockImplementation(async (providerId, entityId, key, options) => {
      if (key === 'slow-entity') {
        return new Promise((_, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new Error('Individual Item Timeout'));
          });
        });
      }
      return `http://resolved.com/${key}`;
    });

    // 2. Prepare mock request
    const requestBody = [
      { providerId: 'test-provider', entityId: 'game', key: 'fast-entity' },
      { providerId: 'test-provider', entityId: 'game', key: 'slow-entity' },
    ];

    const request = new NextRequest('http://localhost/api/resolve-image/batch', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    // 3. Trigger endpoint execute Promise
    const responsePromise = POST(request);

    // Fast-forward time past 3500ms (to trigger individual item timeout 3500)
    await vi.advanceTimersByTimeAsync(4000);

    const response = await responsePromise;
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.results).toBeDefined();

    // Fast item should succeed
    expect(data.results['test-provider:game:fast-entity']).toBe('http://resolved.com/fast-entity');

    // Slow item should be null due to individual item timeout
    expect(data.results['test-provider:game:slow-entity']).toBeNull();
  });
});
