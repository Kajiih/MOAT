/**
 * @file details.ts
 * @description Implements the detail fetching functionality for the MusicBrainz Service.
 * @module MusicBrainzDetails
 */

import { logger } from '@/lib/logger';
import { getArtistThumbnail } from '@/lib/server/images';
import { MediaDetails, MediaType } from '@/lib/types';

import { mbFetch } from './client';
import { DETAILS_CACHE_TTL } from './config';

// Minimal interfaces for raw MusicBrainz details response
interface MBTrack {
  id: string;
  position: string;
  title: string;
  length?: number;
  recording?: {
    id: string;
  };
}

interface MBTag {
  name: string;
  count: number;
}

interface MBRelation {
  type: string;
  url?: {
    resource: string;
  };
}

interface MBSearchResponse {
  releases?: { id: string }[];
}

interface MBReleaseResponse {
  'label-info'?: { label?: { name: string } }[];
  date?: string;
  media?: { tracks?: MBTrack[] }[];
}

interface MBArtistResponse {
  tags?: MBTag[];
  area?: { name: string };
  'life-span'?: { begin?: string; end?: string; ended?: boolean };
  relations?: MBRelation[];
}

interface MBRecordingResponse {
  tags?: MBTag[];
  length?: number;
  releases?: {
    title: string;
    'release-group'?: { id: string };
  }[];
}

async function getAlbumDetails(
  id: string,
): Promise<MediaDetails | { id: string; mbid: string; type: MediaType }> {
  // 1. Find the "best" release for this release group (Official, earliest)
  const query = `rgid:${id} AND status:official`;
  const searchData = await mbFetch<MBSearchResponse>(
    'release',
    `query=${encodeURIComponent(query)}&limit=1`,
    { next: { revalidate: DETAILS_CACHE_TTL } },
  ).catch((error) => {
    logger.warn({ error, id }, '[Details] Search release failed');
    return { releases: [] };
  });

  let release = searchData.releases?.[0];

  if (!release) {
    const lookupData = await mbFetch<MBSearchResponse>(`release-group/${id}`, 'inc=releases', {
      next: { revalidate: DETAILS_CACHE_TTL },
    }).catch((error) => {
      logger.warn({ error, id }, '[Details] Lookup release-group failed');
      return { releases: [] };
    });

    release = lookupData.releases?.[0];
  }

  if (!release) return { id, mbid: id, type: 'album' };

  const data = await mbFetch<MBReleaseResponse>(
    `release/${release.id}`,
    'inc=recordings+media+labels',
    { next: { revalidate: DETAILS_CACHE_TTL } },
  );

  const tracks =
    data.media?.[0]?.tracks?.map((t: MBTrack) => ({
      id: t.recording?.id || t.id,
      position: t.position,
      title: t.title,
      length: t.length ? new Date(t.length).toISOString().slice(14, 19) : '--:--',
    })) || [];

  return {
    id,
    mbid: id,
    type: 'album',
    tracks,
    label: data['label-info']?.[0]?.label?.name,
    date: data.date,
    releaseId: release.id,
    urls: [{ type: 'MusicBrainz', url: `https://musicbrainz.org/release-group/${id}` }],
  };
}

async function getArtistDetails(id: string): Promise<MediaDetails> {
  const data = await mbFetch<MBArtistResponse>(`artist/${id}`, 'inc=url-rels+tags', {
    next: { revalidate: DETAILS_CACHE_TTL },
  });

  return {
    id,
    mbid: id,
    type: 'artist',
    imageUrl: await getArtistThumbnail(id),
    tags:
      data.tags
        ?.toSorted((a: MBTag, b: MBTag) => b.count - a.count)
        .slice(0, 10)
        .map((t: MBTag) => t.name) || [],
    area: data.area?.name,
    lifeSpan: {
      begin: data['life-span']?.begin,
      end: data['life-span']?.end,
      ended: data['life-span']?.ended,
    },
    urls: [
      { type: 'MusicBrainz', url: `https://musicbrainz.org/artist/${id}` },
      ...(data.relations
        ?.filter(
          (r: MBRelation) =>
            r.type === 'wikidata' ||
            r.type === 'wikipedia' ||
            r.type === 'youtube' ||
            r.type === 'social network' ||
            r.type === 'streaming',
        )
        .map((r: MBRelation) => ({
          type: r.type,
          url: r.url?.resource || '',
        })) || []),
    ],
  };
}

async function getSongDetails(id: string): Promise<MediaDetails> {
  const data = await mbFetch<MBRecordingResponse>(
    `recording/${id}`,
    'inc=releases+release-groups+artist-credits+tags',
    { next: { revalidate: DETAILS_CACHE_TTL } },
  );

  const release = data.releases?.[0];
  return {
    id,
    mbid: id,
    type: 'song',
    tags: data.tags?.map((t: MBTag) => t.name) || [],
    length: data.length ? new Date(data.length).toISOString().slice(14, 19) : undefined,
    album: release?.title,
    albumId: release?.['release-group']?.id,
    urls: [{ type: 'MusicBrainz', url: `https://musicbrainz.org/recording/${id}` }],
  };
}

/**
 * Fetches detailed metadata for a specific media item.
 * @param id - The ID of the media item.
 * @param type - The type of the media item.
 * @returns A promise that resolves to the detailed media information.
 */
export async function getMediaDetails(
  id: string,
  type: MediaType,
): Promise<MediaDetails | { id: string; mbid: string; type: MediaType }> {
  try {
    switch (type) {
      case 'album': {
        return await getAlbumDetails(id);
      }
      case 'artist': {
        return await getArtistDetails(id);
      }
      case 'song': {
        return await getSongDetails(id);
      }
      default: {
        return { id, mbid: id, type };
      }
    }
  } catch (error) {
    logger.error({ error, id, type }, 'Error fetching details');
    return { id, mbid: id, type };
  }
}
