import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * INITIAL MOCKS
 */
vi.stubGlobal('fetch', vi.fn());

vi.mock('@/lib/server/image-logic', () => ({
  scrubBoardImages: vi.fn((board) => Promise.resolve(board)),
}));

vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
  },
}));

// We mock ImageResponse as a class/function that returns the args
vi.mock('next/og', () => {
    return {
        ImageResponse: vi.fn().mockImplementation(function (content, options) {
            this.content = content;
            this.options = options;
            return this;
        })
    };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the OGBoard component to avoid rendering issues
vi.mock('@/components/board/OGBoard', () => ({
  OGBoard: vi.fn(() => 'OGBoardComponent'),
}));

import { kv } from '@vercel/kv';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

import { scrubBoardImages } from '@/lib/server/image-logic';

import { GET } from './route';

interface MockImageResponse {
  content: React.ReactNode;
  options: {
    width: number;
    height: number;
  };
}

describe('OG Image API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a default ImageResponse if no ID is provided', async () => {
    const request = new NextRequest('https://moat.app/api/og?title=Custom+Title');
    const result = (await GET(request)) as unknown as MockImageResponse;

    expect(result.options).toMatchObject({
      width: 1200,
      height: 630,
    });
    expect(ImageResponse).toHaveBeenCalled();
  });

  it('should fetch board from KV and scrub images if ID is provided', async () => {
    const mockBoard = {
      title: 'Shared Board',
      tierDefs: [{ id: 't1', label: 'S', color: 'red' }],
      items: { t1: [{ id: 'm1', imageUrl: 'valid.jpg' }] },
    };

    vi.mocked(kv.get).mockResolvedValue(mockBoard);

    const request = new NextRequest('https://moat.app/api/og?id=shared-123');
    await GET(request);

    expect(kv.get).toHaveBeenCalledWith('moat-shared-shared-123');
    expect(scrubBoardImages).toHaveBeenCalledWith(mockBoard);
    expect(ImageResponse).toHaveBeenCalled();
  });

  it('should handle KV errors gracefully and return default ImageResponse', async () => {
    vi.mocked(kv.get).mockRejectedValue(new Error('KV Down'));

    const request = new NextRequest('https://moat.app/api/og?id=shared-123');
    const result = (await GET(request)) as unknown as MockImageResponse;

    expect(result.options).toBeDefined();
    expect(kv.get).toHaveBeenCalled();
  });

  it('should return 500 Response if everything fails', async () => {
    vi.mocked(ImageResponse).mockImplementationOnce(() => {
      throw new Error('Explosion');
    });

    const request = new NextRequest('https://moat.app/api/og');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
