import { z } from 'zod';
import { 
    MusicBrainzArtistCreditSchema, 
    MusicBrainzReleaseGroupSchema,
    MusicBrainzArtistSchema,
    MusicBrainzRecordingSchema,
    MediaItem, 
} from '@/lib/types';
import { getArtistThumbnail } from '@/lib/server/images';

const COVER_ART_ARCHIVE_BASE_URL = 'https://coverartarchive.org';

export const formatArtistCredit = (credits: z.infer<typeof MusicBrainzArtistCreditSchema>[] | undefined) => {
    if (!credits || credits.length === 0) return 'Unknown';
    return credits.map(c => (c.name + (c.joinphrase || ''))).join('');
};

export function mapReleaseGroupToMediaItem(item: z.infer<typeof MusicBrainzReleaseGroupSchema>): MediaItem {
    return {
        id: item.id,
        type: 'album',
        title: item.title,
        artist: formatArtistCredit(item['artist-credit']),
        year: item['first-release-date']?.split('-')[0] || '',
        date: item['first-release-date'],
        imageUrl: `${COVER_ART_ARCHIVE_BASE_URL}/release-group/${item.id}/front-250`,
        primaryType: item['primary-type'],
        secondaryTypes: item['secondary-types']
    };
}

export async function mapArtistToMediaItem(item: z.infer<typeof MusicBrainzArtistSchema>): Promise<MediaItem> {
    const thumb = await getArtistThumbnail(item.id);
    return {
        id: item.id,
        type: 'artist',
        title: item.name, 
        year: item['life-span']?.begin?.split('-')[0] || '',
        date: item['life-span']?.begin,
        imageUrl: thumb,
        disambiguation: item.disambiguation 
    };
}

export function mapRecordingToMediaItem(item: z.infer<typeof MusicBrainzRecordingSchema>): MediaItem {
    const releaseId = item.releases?.[0]?.id;
    return {
        id: item.id,
        type: 'song',
        title: item.title,
        artist: formatArtistCredit(item['artist-credit']),
        album: item.releases?.[0]?.title, 
        year: item['first-release-date']?.split('-')[0] || '',
        date: item['first-release-date'],
        imageUrl: releaseId ? `${COVER_ART_ARCHIVE_BASE_URL}/release/${releaseId}/front-250` : undefined
    };
}
