import { NextResponse } from 'next/server';
import { MediaType } from '@/lib/types';
import { searchMusicBrainz } from '@/lib/server/musicbrainz';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') as MediaType) || 'album';
  const queryParam = searchParams.get('query') || ''; 
  const artistParam = searchParams.get('artist');
  const artistIdParam = searchParams.get('artistId');
  const minYear = searchParams.get('minYear');
  const maxYear = searchParams.get('maxYear');
  
  const albumPrimaryTypes = searchParams.getAll('albumPrimaryTypes');
  const albumSecondaryTypes = searchParams.getAll('albumSecondaryTypes');
  
  // Read Search Configuration (default to true if not specified)
  const fuzzy = searchParams.get('fuzzy') !== 'false';
  const wildcard = searchParams.get('wildcard') !== 'false';
  
  const page = parseInt(searchParams.get('page') || '1', 10);

  // If no main filters, return empty
  if (!queryParam && !artistParam && !artistIdParam && !minYear && !maxYear && albumPrimaryTypes.length === 0 && albumSecondaryTypes.length === 0) {
    return NextResponse.json({ results: [], page, totalPages: 0 });
  }

  try {
    const result = await searchMusicBrainz({
      type,
      query: queryParam,
      artist: artistParam,
      artistId: artistIdParam,
      minYear,
      maxYear,
      albumPrimaryTypes,
      albumSecondaryTypes,
      page,
      options: { fuzzy, wildcard }
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
