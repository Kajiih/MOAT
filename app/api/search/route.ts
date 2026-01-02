import { NextResponse } from 'next/server';
import { MusicBrainzSearchResponseSchema, Album } from '@/lib/types';

// Rate Limiting constants
const USER_AGENT = 'JulianTierList/1.0.0 ( contact@yourdomain.com )';
const MB_BASE_URL = 'https://musicbrainz.org/ws/2/release-group/';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');
  const year = searchParams.get('year');

  if (!title && !artist && !year) {
    return NextResponse.json({ results: [] });
  }

  // 1. Construct Lucene Query
  const queryParts: string[] = [];
  if (title) queryParts.push(`release-group:"${title}"`);
  if (artist) queryParts.push(`artist:"${artist}"`);
  if (year) queryParts.push(`date:${year}`);
  
  const query = queryParts.join(' AND ');

  try {
    // 2. Fetch from MusicBrainz
    const response = await fetch(
      `${MB_BASE_URL}?query=${encodeURIComponent(query)}&fmt=json&limit=15`,
      {
        headers: { 'User-Agent': USER_AGENT },
        // Next.js caching: Cache results for 1 hour to save API hits
        next: { revalidate: 3600 } 
      }
    );

    if (!response.ok) {
      throw new Error(`MusicBrainz API Error: ${response.status}`);
    }

    const rawData = await response.json();

    // 3. Validate Data with Zod
    const parsed = MusicBrainzSearchResponseSchema.safeParse(rawData);
    
    if (!parsed.success) {
      console.error("Validation Failed", parsed.error);
      return NextResponse.json({ error: 'Invalid data from upstream' }, { status: 502 });
    }

    // 4. Transform to our Domain Model
    const results: Album[] = (parsed.data['release-groups'] || []).map((item) => ({
      id: item.id,
      title: item.title,
      artist: item['artist-credit']?.[0]?.name || 'Unknown',
      year: item['first-release-date']?.split('-')[0] || '',
      imageUrl: `https://coverartarchive.org/release-group/${item.id}/front`,
    }));

    return NextResponse.json({ results });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
