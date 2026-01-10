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
    const release = item.releases?.[0];
    const albumId = release?.['release-group']?.id;
    const releaseId = release?.id;

    // Preference: Use release-group ID for image if available, otherwise fallback to release ID
    let imageUrl: string | undefined = undefined;
    if (albumId) {
        imageUrl = `${COVER_ART_ARCHIVE_BASE_URL}/release-group/${albumId}/front-250`;
    } else if (releaseId) {
        imageUrl = `${COVER_ART_ARCHIVE_BASE_URL}/release/${releaseId}/front-250`;
    }

    return {
        id: item.id,
        type: 'song',
        title: item.title,
        artist: formatArtistCredit(item['artist-credit']),
        album: release?.title,
        albumId: albumId,
        year: item['first-release-date']?.split('-')[0] || '',
        date: item['first-release-date'],
        imageUrl,
        duration: item.length
    };
}
