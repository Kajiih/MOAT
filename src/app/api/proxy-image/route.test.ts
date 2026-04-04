/**
 * @file route.test.ts
 * @description Unit/Integration tests for /api/proxy-image route with mocked registry.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registry } from '@/infra/providers/registry';

import { GET } from './route';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock the registry to make the test provider-agnostic
vi.mock('@/infra/providers/registry', () => ({
  registry: {
    waitUntilReady: vi.fn(),
    isHostAllowed: vi.fn(),
  },
}));

// Mock bootstrap to prevent it from executing and failing due to mocked registry
vi.mock('@/infra/providers/bootstrap', () => ({}));

describe('Proxy Image API Route - Mocked Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default fetch mock (success with empty buffer)
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'image/png']]),
      arrayBuffer: async () => new ArrayBuffer(0),
    });

    // Default registry mock to resolve immediately
    vi.mocked(registry.waitUntilReady).mockResolvedValue(undefined);
  });

  it('should return 400 if url parameter is missing', async () => {
    const request = new NextRequest('http://localhost/api/proxy-image');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toBe('Missing URL parameter');
  });

  it('should return 400 if url is invalid', async () => {
    const request = new NextRequest('http://localhost/api/proxy-image?url=not-a-url');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toBe('Invalid URL');
  });

  it('should return 403 for disallowed host', async () => {
    vi.mocked(registry.isHostAllowed).mockReturnValue(false);

    const request = new NextRequest('http://localhost/api/proxy-image?url=https://any-host.com/image.png');
    const response = await GET(request);

    expect(response.status).toBe(403);
    const text = await response.text();
    expect(text).toBe('Domain not allowed');
  });

  it('should return 200 for allowed host', async () => {
    vi.mocked(registry.isHostAllowed).mockReturnValue(true);

    const request = new NextRequest('http://localhost/api/proxy-image?url=https://any-allowed-host.com/image.jpg');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('should return 500 if upstream fetch throws', async () => {
    vi.mocked(registry.isHostAllowed).mockReturnValue(true);
    mockFetch.mockRejectedValue(new Error('Network error'));

    const request = new NextRequest('http://localhost/api/proxy-image?url=https://any-allowed-host.com/image.jpg');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe('Internal Server Error');
  });

  it('should return upstream status if not ok', async () => {
    vi.mocked(registry.isHostAllowed).mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const request = new NextRequest('http://localhost/api/proxy-image?url=https://any-allowed-host.com/image.jpg');
    const response = await GET(request);

    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).toContain('Upstream error: 404');
  });
});
