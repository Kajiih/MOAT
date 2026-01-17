import { describe, it, expect, vi } from 'vitest';
import {
  mapReleaseGroupToMediaItem,
  mapRecordingToMediaItem,
  formatArtistCredit,
  mapArtistToMediaItem,
} from './mappers';
import { SongItem, MusicBrainzRecordingSchema } from '@/lib/types';
import { z } from 'zod';

type MusicBrainzRecording = z.infer<typeof MusicBrainzRecordingSchema>;

// Mock getArtistThumbnail since it makes fetch calls
vi.mock('@/lib/server/images', () => ({
  getArtistThumbnail: vi.fn().mockResolvedValue('mock-url'),
}));

describe('Mappers', () => {
  describe('formatArtistCredit', () => {
    it('should format simple credit', () => {
      const credit = [{ name: 'Adele', joinphrase: '' }];
      expect(formatArtistCredit(credit)).toBe('Adele');
    });

    it('should format joined credits', () => {
      const credit = [
        { name: 'Queen', joinphrase: ' & ' },
        { name: 'David Bowie', joinphrase: '' },
      ];
      expect(formatArtistCredit(credit)).toBe('Queen & David Bowie');
    });

    it('should handle undefined', () => {
      expect(formatArtistCredit(undefined)).toBe('Unknown');
    });
  });

  describe('mapReleaseGroupToMediaItem', () => {
    it('should map valid release group', () => {
      const input = {
        id: '123',
        title: 'Album Title',
        'first-release-date': '2023-01-01',
        'artist-credit': [{ name: 'Artist' }],
        'primary-type': 'Album',
      };
      const result = mapReleaseGroupToMediaItem(input);
      expect(result).toEqual({
        id: '123',
        type: 'album',
        title: 'Album Title',
        artist: 'Artist',
        year: '2023',
        date: '2023-01-01',
        imageUrl: 'https://coverartarchive.org/release-group/123/front-250',
        primaryType: 'Album',
        secondaryTypes: undefined,
      });
    });
  });

  describe('mapRecordingToMediaItem', () => {
    it('should map recording with release and release-group', () => {
      const input: MusicBrainzRecording = {
        id: 'rec1',
        title: 'Song',
        'artist-credit': [{ name: 'Singer', joinphrase: '' }],
        releases: [
          {
            id: 'rel1',
            title: 'Album',
            'release-group': { id: 'rg1' },
          },
        ],
      };
      const result = mapRecordingToMediaItem(input) as SongItem;
      expect(result.album).toBe('Album');
      expect(result.albumId).toBe('rg1');
      expect(result.imageUrl).toBe('https://coverartarchive.org/release-group/rg1/front-250');
    });

    it('should fallback to release image if release-group is missing', () => {
      const input: MusicBrainzRecording = {
        id: 'rec1',
        title: 'Song',
        'artist-credit': [{ name: 'Singer', joinphrase: '' }],
        releases: [{ id: 'rel1', title: 'Album' }],
      };
      const result = mapRecordingToMediaItem(input);
      expect(result.imageUrl).toBe('https://coverartarchive.org/release/rel1/front-250');
    });
  });

  describe('mapArtistToMediaItem', () => {
    it('should map artist', async () => {
      const input = {
        id: 'art1',
        name: 'The Band',
        'life-span': { begin: '1990' },
      };
      const result = await mapArtistToMediaItem(input);
      expect(result.year).toBe('1990');
      expect(result.imageUrl).toBe('mock-url');
    });
  });
});
