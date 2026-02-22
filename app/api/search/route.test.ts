import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMediaService } from '@/lib/services/factory';

import { GET } from './route';

// Mock everything
vi.mock('@/lib/services/factory', () => ({
  getMediaService: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

describe('Search API Route', () => {
  const mockSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMediaService).mockReturnValue({
      search: mockSearch,
    } as unknown as ReturnType<typeof getMediaService>);
  });

  it('calls the correct service with parsed options', async () => {
    const url =
      'http://localhost/api/search?query=Queen&type=artist&category=music&minYear=1970&fuzzy=false';
    const request = new Request(url);

    mockSearch.mockResolvedValue({ results: [], page: 1, totalPages: 1 });

    await GET(request);

    expect(getMediaService).toHaveBeenCalledWith('music');
    expect(mockSearch).toHaveBeenCalledWith(
      'Queen',
      'artist',
      expect.objectContaining({
        page: 1,
        fuzzy: false,
        filters: expect.objectContaining({
          minYear: '1970',
        }),
      }),
    );
  });

  it('returns empty results if no query and no filters provided', async () => {
    const url = 'http://localhost/api/search?query=';
    const request = new Request(url);

    const response = await GET(request);
    const data = await response.json();

    expect(data.results).toEqual([]);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('allows empty results for discovery categories like cinema', async () => {
    const url = 'http://localhost/api/search?query=&category=cinema&type=movie';
    const request = new Request(url);

    mockSearch.mockResolvedValue({ results: [], page: 1, totalPages: 0 });

    await GET(request);

    expect(getMediaService).toHaveBeenCalledWith('cinema');
    expect(mockSearch).toHaveBeenCalledWith('', 'movie', expect.anything());
  });

  it('handles service errors and maps specific codes', async () => {
    const url = 'http://localhost/api/search?query=Queen';
    const request = new Request(url);

    mockSearch.mockRejectedValue(new Error('MusicBrainz API Error: 503 Service Unavailable'));

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain('rate limit reached');
  });

  it('parses toggle-group filters (multi-select)', async () => {
    const url =
      'http://localhost/api/search?query=rock&type=album&albumPrimaryTypes=Album&albumPrimaryTypes=EP';
    const request = new Request(url);

    mockSearch.mockResolvedValue({ results: [] });

    await GET(request);

    expect(mockSearch).toHaveBeenCalledWith(
      'rock',
      'album',
      expect.objectContaining({
        filters: expect.objectContaining({
          albumPrimaryTypes: ['Album', 'EP'],
        }),
      }),
    );
  });
});
