/**
 * @file ArtistPicker.tsx
 * @description Specialized wrapper around MediaPicker for selecting artists.
 * @module ArtistPicker
 */

'use client';

import { ArtistSelection } from '@/lib/types';
import { MediaPicker } from './MediaPicker';

interface ArtistPickerProps {
  onSelect: (artist: ArtistSelection | null) => void;
  selectedArtist: ArtistSelection | null;
  fuzzy?: boolean;
  wildcard?: boolean;
  context?: string; 
}

export function ArtistPicker({ onSelect, selectedArtist, fuzzy, wildcard, context }: ArtistPickerProps) {
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
