import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getArtistThumbnail } from '@/lib/server/images';

import { mbFetch } from './client';
import { getMediaDetails } from './details';

// Mock dependencies
vi.mock('./client', () => ({
  mbFetch: vi.fn(),
}));

vi.mock('@/lib/server/images', () => ({
  getArtistThumbnail: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('MusicBrainz Details Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getArtistDetails', () => {
    it('should fetch and map artist details correctly', async () => {
      const mockId = 'artist-1';
      const mockResponse = {
        tags: [{ name: 'rock', count: 10 }, { name: 'indie', count: 20 }],
        area: { name: 'London' },
        'life-span': { begin: '1990', ended: false },
        relations: [
          { type: 'wikidata', url: { resource: 'https://wikidata/Q123' } },
        ],
      };

      vi.mocked(mbFetch).mockResolvedValue(mockResponse);
      vi.mocked(getArtistThumbnail).mockResolvedValue('thumbnail-url');

      const result = await getMediaDetails(mockId, 'artist');

      expect(result).toMatchObject({
        id: mockId,
        type: 'artist',
        tags: ['indie', 'rock'],
        area: 'London',
        imageUrl: 'thumbnail-url',
        urls: [{ type: 'wikidata', url: 'https://wikidata/Q123' }],
      });
      expect(mbFetch).toHaveBeenCalledWith(`artist/${mockId}`, expect.any(String), expect.any(Object));
    });
  });

  describe('getAlbumDetails', () => {
    it('should fetch release-group and then release details', async () => {
      const mockId = 'album-1';
      const mockSearchResponse = {
        releases: [{ id: 'release-1' }],
      };
      const mockReleaseResponse = {
        'label-info': [{ label: { name: 'The Label' } }],
        date: '2020-01-01',
        media: [{
          tracks: [
            { id: 't1', position: '1', title: 'Track 1', length: 180_000, recording: { id: 'r1' } },
          ],
        }],
      };

      vi.mocked(mbFetch).mockResolvedValueOnce(mockSearchResponse);
      vi.mocked(mbFetch).mockResolvedValueOnce(mockReleaseResponse);

      const result = await getMediaDetails(mockId, 'album');

      expect(result).toMatchObject({
        id: mockId,
        type: 'album',
        label: 'The Label',
        date: '2020-01-01',
        tracks: [
          { id: 'r1', position: '1', title: 'Track 1', length: '03:00' },
        ],
      });
      // First call for release search
      expect(mbFetch).toHaveBeenCalledWith('release', expect.stringContaining('album-1'), expect.any(Object));
      // Second call for the specific release
      expect(mbFetch).toHaveBeenCalledWith('release/release-1', expect.any(String), expect.any(Object));
    });

    it('should return skeletal details if no release is found', async () => {
      const mockId = 'album-1';
      vi.mocked(mbFetch).mockResolvedValue({ releases: [] });

      const result = await getMediaDetails(mockId, 'album');
      expect(result).toEqual({ id: mockId, mbid: mockId, type: 'album' });
    });
  });

  describe('getSongDetails', () => {
    it('should fetch and map recording details correctly', async () => {
      const mockId = 'song-1';
      const mockResponse = {
        tags: [{ name: 'pop', count: 1 }],
        length: 240_000,
        releases: [{
          title: 'The Album',
          'release-group': { id: 'rg-1' },
        }],
      };

      vi.mocked(mbFetch).mockResolvedValue(mockResponse);

      const result = await getMediaDetails(mockId, 'song');

      expect(result).toMatchObject({
        id: mockId,
        type: 'song',
        tags: ['pop'],
        length: '04:00',
        album: 'The Album',
        albumId: 'rg-1',
      });
      expect(mbFetch).toHaveBeenCalledWith(`recording/${mockId}`, expect.any(String), expect.any(Object));
    });
  });

  it('should return fallback if service fails', async () => {
    vi.mocked(mbFetch).mockRejectedValue(new Error('MB Down'));
    const result = await getMediaDetails('1', 'artist');
    expect(result).toEqual({ id: '1', mbid: '1', type: 'artist' });
  });
});
