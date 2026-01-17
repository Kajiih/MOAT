/**
 * @file details.ts
 * @description Implements the detail fetching functionality for the MusicBrainz Service.
 * @module MusicBrainzDetails
 */

import { MediaType, MediaDetails } from '@/lib/types';
import { getArtistThumbnail } from '@/lib/server/images';
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

/**
 * Fetches detailed metadata for a specific media item.
 */
export async function getMediaDetails(
  id: string,
  type: MediaType,
): Promise<MediaDetails | { id: string; type: MediaType }> {
  try {
    if (type === 'album') {
      // 1. Find the "best" release for this release group (Official, earliest)
      const query = `rgid:${id} AND status:official`;
      const searchData = await mbFetch<MBSearchResponse>(
        'release',
        `query=${encodeURIComponent(query)}&limit=1`,
        { next: { revalidate: DETAILS_CACHE_TTL } },
      ).catch((err) => {
        console.warn(`[Details] Search release failed for ${id}`, err);
        return { releases: [] };
      }); // return safe empty object on error

      let release = null;
      if (searchData.releases && searchData.releases.length > 0) {
        release = searchData.releases[0];
      }

      if (!release) {
        const lookupData = await mbFetch<MBSearchResponse>(`release-group/${id}`, 'inc=releases', {
          next: { revalidate: DETAILS_CACHE_TTL },
        }).catch((err) => {
          console.warn(`[Details] Lookup release-group failed for ${id}`, err);
          return { releases: [] };
        });

        if (lookupData.releases && lookupData.releases.length > 0) {
          release = lookupData.releases[0];
        }
      }

      if (!release) return { id, type };

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
          length: t.length ? new Date(t.length).toISOString().substr(14, 5) : '--:--',
        })) || [];

      return {
        id,
        type: 'album',
        tracks,
        label: data['label-info']?.[0]?.label?.name,
        date: data.date,
        releaseId: release.id,
      };
    }

    if (type === 'artist') {
      const data = await mbFetch<MBArtistResponse>(`artist/${id}`, 'inc=url-rels+tags', {
        next: { revalidate: DETAILS_CACHE_TTL },
      });

      return {
        id,
        type: 'artist',
        imageUrl: await getArtistThumbnail(id),
        tags:
          data.tags
            ?.sort((a: MBTag, b: MBTag) => b.count - a.count)
            .slice(0, 10)
            .map((t: MBTag) => t.name) || [],
        area: data.area?.name,
        lifeSpan: {
          begin: data['life-span']?.begin,
          end: data['life-span']?.end,
          ended: data['life-span']?.ended,
        },
        urls: data.relations
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
          })),
      };
    }

    if (type === 'song') {
      const data = await mbFetch<MBRecordingResponse>(
        `recording/${id}`,
        'inc=releases+release-groups+artist-credits+tags',
        { next: { revalidate: DETAILS_CACHE_TTL } },
      );

      const release = data.releases?.[0];
      return {
        id,
        type: 'song',
        tags: data.tags?.map((t: MBTag) => t.name) || [],
        length: data.length ? new Date(data.length).toISOString().substr(14, 5) : undefined,
        album: release?.title,
        albumId: release?.['release-group']?.id,
      };
    }

    return { id, type };
  } catch (e) {
    console.error('Error fetching details', e);
    return { id, type };
  }
}
