/**
 * @file AlbumPicker.tsx
 * @description Specialized wrapper around MediaPicker for selecting albums.
 * @module AlbumPicker
 */

'use client';

import { AlbumSelection } from '@/lib/types';
import { MediaPicker } from './MediaPicker';

interface AlbumPickerProps {
  onSelect: (album: AlbumSelection | null) => void;
  selectedAlbum: AlbumSelection | null;
  fuzzy?: boolean;
  wildcard?: boolean;
  artistId?: string;
  context?: string;
}

export function AlbumPicker({
  onSelect,
  selectedAlbum,
  fuzzy,
  wildcard,
  artistId,
  context,
}: AlbumPickerProps) {
  return (
    <MediaPicker
      type="album"
      selectedItem={selectedAlbum}
      onSelect={onSelect}
      fuzzy={fuzzy}
      wildcard={wildcard}
      artistId={artistId}
      context={context}
      placeholder="Filter by Album..."
    />
  );
}
