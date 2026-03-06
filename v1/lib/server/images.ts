/**
 * @file images.ts
 * @description Server-side utilities for resolving artist and album artwork.
 * Implements a waterfall strategy: Fanart.tv -> Wikidata -> Fallbacks.
 * Handles API keys and URL construction for external image services.
 * @module ImageService
 */

import { logger } from '@/lib/logger';
import { MB_BASE_URL, USER_AGENT } from '@/lib/services/musicbrainz/config';

const FANART_BASE_URL = 'https://webservice.fanart.tv/v3/music';
const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
const WIKIMEDIA_FILE_PATH_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const IMAGE_CACHE_TTL = 86_400; // 24 hours

/**
 * Constructs a Wikimedia Commons image URL.
 * @param fileName - The file name from Wikidata (e.g. "Image.jpg").
 * @param [width] - Desired width for the thumbnail.
 * @returns The constructed URL.
 */
function getWikimediaUrl(fileName: string, width: number = 500): string {
  return `${WIKIMEDIA_FILE_PATH_URL}/${encodeURIComponent(fileName)}?width=${width}`;
}

/**
 * Constructs a Fanart.tv API URL.
 * @param mbid - The MusicBrainz ID of the artist.
 * @param apiKey - The Fanart.tv API key.
 * @returns The Fanart.tv API URL.
 */
function getFanartApiUrl(mbid: string, apiKey: string): string {
  return `${FANART_BASE_URL}/${mbid}?api_key=${apiKey}`;
}

/**
 * Constructs a Fanart.tv preview URL from a full-size image URL.
 * @param url - The full-size image URL from Fanart.tv.
 * @returns The Fanart.tv preview URL.
 */
function getFanartPreviewUrl(url: string): string {
  return url.replace('/fanart/', '/preview/');
}

/**
 * Fetches an artist thumbnail from Fanart.tv if available.
 * @param mbid - The MusicBrainz ID of the artist.
 * @returns A promise that resolves to the image URL or undefined.
 */
export async function getFanartImage(mbid: string): Promise<string | undefined> {
  const apiKey = process.env.FANART_API_KEY;
  if (!apiKey) return undefined;
  try {
    const res = await fetch(getFanartApiUrl(mbid, apiKey), {
      next: { revalidate: IMAGE_CACHE_TTL },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    const url = data.artistthumb?.[0]?.url;

    return url ? getFanartPreviewUrl(url) : undefined;
  } catch (error) {
    logger.error({ error, mbid }, 'Fanart.tv fetch failed');
    return undefined;
  }
}

/**
 * Fetches an artist thumbnail from Wikidata via MusicBrainz relations.
 * @param mbid - The MusicBrainz ID of the artist.
 * @returns A promise that resolves to the image URL or undefined.
 */
export async function getWikidataImage(mbid: string): Promise<string | undefined> {
  try {
    // 1. Get Wikidata ID from MusicBrainz
    const mbRes = await fetch(`${MB_BASE_URL}/artist/${mbid}?inc=url-rels&fmt=json`, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: IMAGE_CACHE_TTL },
    });
    if (!mbRes.ok) return undefined;
    const mbData = await mbRes.json();

    // Find relation type 'wikidata'
    const wikidataRel = mbData.relations?.find(
      (r: { type: string; url?: { resource: string } }) => r.type === 'wikidata',
    );
    if (!wikidataRel?.url?.resource) return undefined;

    // Extract QID (e.g. Q12345 from url)
    const qid = wikidataRel.url.resource.split('/').pop();
    if (!qid) return undefined;

    // 2. Get Image from Wikidata
    // P18 is the "image" property
    const wdRes = await fetch(
      `${WIKIDATA_API_URL}?action=wbgetclaims&property=P18&entity=${qid}&format=json`,
      {
        next: { revalidate: IMAGE_CACHE_TTL },
      },
    );
    if (!wdRes.ok) return undefined;
    const wdData = await wdRes.json();

    const fileName = wdData.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!fileName) return undefined;

    // 3. Convert Wiki Filename to URL
    return getWikimediaUrl(fileName);
  } catch (error) {
    logger.error({ error, mbid }, 'Wikidata fetch failed');
    return undefined;
  }
}

/**
 * Gets the artist thumbnail.
 * @param mbid - The MusicBrainz ID of the artist.
 * @returns A promise that resolves to the image URL or undefined.
 */
export async function getArtistThumbnail(mbid: string): Promise<string | undefined> {
  // Priority 1: Fanart.tv (Best quality)
  const fanart = await getFanartImage(mbid);
  if (fanart) return fanart;

  // Priority 2: Wikidata (Best coverage)
  return await getWikidataImage(mbid);
}
