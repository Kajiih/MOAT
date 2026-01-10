import { NextResponse } from 'next/server';
import { MediaType } from '@/lib/types';
import { searchMusicBrainz } from '@/lib/server/musicbrainz';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') as MediaType) || 'album';
  const queryParam = searchParams.get('query') || ''; 
  const artistParam = searchParams.get('artist');
  const artistIdParam = searchParams.get('artistId');
  const albumIdParam = searchParams.get('albumId');
  const minYear = searchParams.get('minYear');
  const maxYear = searchParams.get('maxYear');
  
  const albumPrimaryTypes = searchParams.getAll('albumPrimaryTypes');
  const albumSecondaryTypes = searchParams.getAll('albumSecondaryTypes');
  
  const artistType = searchParams.get('artistType');
  const artistCountry = searchParams.get('artistCountry');
  const tag = searchParams.get('tag');
  const videoOnly = searchParams.get('videoOnly') === 'true';

  // Read Search Configuration (default to true if not specified)
  const fuzzy = searchParams.get('fuzzy') !== 'false';
  const wildcard = searchParams.get('wildcard') !== 'false';
  
  const page = parseInt(searchParams.get('page') || '1', 10);

  // If no main filters, return empty
  if (!queryParam && !artistParam && !artistIdParam && !albumIdParam && !minYear && !maxYear && albumPrimaryTypes.length === 0 && albumSecondaryTypes.length === 0 && !artistType && !artistCountry && !tag && !videoOnly) {
    return NextResponse.json({ results: [], page, totalPages: 0 });
  }

  try {
    const result = await searchMusicBrainz({
      type,
      query: queryParam,
      artist: artistParam,
      artistId: artistIdParam,
      albumId: albumIdParam,
      minYear,
      maxYear,
      albumPrimaryTypes,
      albumSecondaryTypes,
      artistType: artistType || undefined,
      artistCountry: artistCountry || undefined,
      tag: tag || undefined,
      videoOnly,
      page,
      options: { fuzzy, wildcard }
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error(error);
    const status = error.message?.includes('503') ? 503 : 500;
    return NextResponse.json(
      { error: status === 503 ? 'MusicBrainz rate limit reached' : 'Internal Server Error' }, 
      { status }
    );
  }
}
