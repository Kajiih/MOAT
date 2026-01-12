/**
 * @file images.ts
 * @description Server-side utilities for resolving artist and album artwork.
 * Implements a waterfall strategy: Fanart.tv -> Wikidata -> Fallbacks.
 * Handles API keys and URL construction for external image services.
 * @module ImageService
 */

export const USER_AGENT = 'MOAT/1.0.0 ( itskajih@gmail.com )';
export const MB_BASE_URL = 'https://musicbrainz.org/ws/2';

const FANART_API_KEY = process.env.FANART_API_KEY;
const FANART_BASE_URL = 'https://webservice.fanart.tv/v3/music';
const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
const WIKIMEDIA_FILE_PATH_URL = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const IMAGE_CACHE_TTL = 86400; // 24 hours

/**
 * Fetches an artist thumbnail from Fanart.tv if available.
 */
export async function getFanartImage(mbid: string): Promise<string | undefined> {
  if (!FANART_API_KEY) return undefined;
  try {
    const res = await fetch(`${FANART_BASE_URL}/${mbid}?api_key=${FANART_API_KEY}`, {
        next: { revalidate: IMAGE_CACHE_TTL } 
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    const url = data.artistthumb?.[0]?.url;
    
    // Use the preview endpoint for a smaller image (~200px instead of ~1000px)
    return url ? url.replace('/fanart/', '/preview/') : undefined;
  } catch (e) {
    console.error(`Fanart.tv fetch failed for mbid ${mbid}:`, e);
    return undefined;
  }
}

/**
 * Fetches an artist thumbnail from Wikidata via MusicBrainz relations.
 */
export async function getWikidataImage(mbid: string): Promise<string | undefined> {
  try {
    // 1. Get Wikidata ID from MusicBrainz
    const mbRes = await fetch(`${MB_BASE_URL}/artist/${mbid}?inc=url-rels&fmt=json`, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: IMAGE_CACHE_TTL }
    });
    if (!mbRes.ok) return undefined;
    const mbData = await mbRes.json();
    
    // Find relation type 'wikidata'
    const wikidataRel = mbData.relations?.find((r: { type: string; url?: { resource: string } }) => r.type === 'wikidata');
    if (!wikidataRel?.url?.resource) return undefined;

    // Extract QID (e.g. Q12345 from url)
    const qid = wikidataRel.url.resource.split('/').pop();
    if (!qid) return undefined;

    // 2. Get Image from Wikidata
    // P18 is the "image" property
    const wdRes = await fetch(`${WIKIDATA_API_URL}?action=wbgetclaims&property=P18&entity=${qid}&format=json`, {
        next: { revalidate: IMAGE_CACHE_TTL }
    });
    if (!wdRes.ok) return undefined;
    const wdData = await wdRes.json();

    const fileName = wdData.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!fileName) return undefined;

    // 3. Convert Wiki Filename to URL (MD5 Hash method for Wikimedia Commons)
    // Actually, simpler is to use the Special:FilePath redirect
    // BUT we need to encode it properly.
    return `${WIKIMEDIA_FILE_PATH_URL}/${encodeURIComponent(fileName)}?width=500`;

  } catch (e) {
    console.error(`Wikidata fetch failed for mbid ${mbid}:`, e);
    return undefined;
  }
}

export async function getArtistThumbnail(mbid: string): Promise<string | undefined> {
    // Priority 1: Fanart.tv (Best quality)
    const fanart = await getFanartImage(mbid);
    if (fanart) return fanart;

    // Priority 2: Wikidata (Best coverage)
    return await getWikidataImage(mbid);
}
