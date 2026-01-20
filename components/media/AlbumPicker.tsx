/**
 * @file AlbumPicker.tsx
 * @description Specialized wrapper around MediaPicker for selecting albums.
 * @module AlbumPicker
 */

'use client';

import { AlbumSelection } from '@/lib/types';

import { MediaPicker } from './MediaPicker';

/**
 * Props for the AlbumPicker component.
 */
interface AlbumPickerProps {
  /** Callback fired when an album is selected or cleared. */
  onSelect: (album: AlbumSelection | null) => void;
  /** The currently selected album. */
  selectedAlbum: AlbumSelection | null;
  /** Whether to use fuzzy matching for search. */
  fuzzy?: boolean;
  /** Whether to use wildcards for search. */
  wildcard?: boolean;
  /** Optional artist ID to filter albums by artist. */
  artistId?: string;
  /** Optional context string for analytical tracking. */
  context?: string;
}

/**
 * Renders a specialized picker for selecting musical albums.
 * @param props - The props for the component.
 * @param props.onSelect - Callback fired when an album is selected or cleared.
 * @param props.selectedAlbum - The currently selected album.
 * @param [props.fuzzy] - Whether to use fuzzy matching for search.
 * @param [props.wildcard] - Whether to use wildcards for search.
 * @param [props.artistId] - Optional artist ID to filter albums by artist.
 * @param [props.context] - Optional context string for analytical tracking.
 */
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
