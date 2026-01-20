/**
 * @file ArtistPicker.tsx
 * @description Specialized wrapper around MediaPicker for selecting artists.
 * @module ArtistPicker
 */

'use client';

import { ArtistSelection } from '@/lib/types';

import { MediaPicker } from './MediaPicker';

/**
 * Props for the ArtistPicker component.
 */
interface ArtistPickerProps {
  /** Callback fired when an artist is selected or cleared. */
  onSelect: (artist: ArtistSelection | null) => void;
  /** The currently selected artist. */
  selectedArtist: ArtistSelection | null;
  /** Whether to use fuzzy matching for search. */
  fuzzy?: boolean;
  /** Whether to use wildcards for search. */
  wildcard?: boolean;
  /** Optional context string for analytical tracking. */
  context?: string;
}

/**
 * Renders a specialized picker for selecting musical artists.
 * @param props - The props for the component.
 * @param props.onSelect - Callback fired when an artist is selected or cleared.
 * @param props.selectedArtist - The currently selected artist.
 * @param [props.fuzzy] - Whether to use fuzzy matching for search.
 * @param [props.wildcard] - Whether to use wildcards for search.
 * @param [props.context] - Optional context string for analytical tracking.
 */
export function ArtistPicker({
  onSelect,
  selectedArtist,
  fuzzy,
  wildcard,
  context,
}: ArtistPickerProps) {
  return (
    <MediaPicker
      type="artist"
      selectedItem={selectedArtist}
      onSelect={onSelect}
      fuzzy={fuzzy}
      wildcard={wildcard}
      context={context}
      placeholder="Filter by Artist..."
    />
  );
}
