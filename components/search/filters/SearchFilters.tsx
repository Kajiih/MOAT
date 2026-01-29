/**
 * @file SearchFilters.tsx
 * @description Renders a collection of dynamic filter components based on the active media service.
 * @module SearchFilters
 */

import { MediaPicker } from '@/components/media/MediaPicker';
import { useTierListContext } from '@/components/providers/TierListContext';
import { SearchParamsState } from '@/components/search/hooks/useMediaSearch';
import { getMediaService } from '@/lib/services/factory';
import { ArtistSelection, MediaSelection, MediaType } from '@/lib/types';

import { AlbumFilters } from './AlbumFilters'; // Keep for now for music
// Keep for now for music
import { DateRangeFilter } from './DateRangeFilter';
import { FILTER_INPUT_STYLES } from './FilterPrimitives';

/**
 * Props for the SearchFilters component.
 */
interface SearchFiltersProps {
  /** The current search mode (artist, album, or song). */
  type: MediaType;
  /** The current state of all search filters. */
  filters: SearchParamsState;
  /** Callback to update one or more filter values. */
  updateFilters: (patch: Partial<SearchParamsState>) => void;
  /** Whether to render in a compact layout (for pickers). */
  compact?: boolean;
}

/**
 * Renders the full suite of search filters tailored to the active media type.
 * Combines entity-specific logic with shared filters like date range and tags.
 * @param props - Component props.
 * @param props.type - The active media type.
 * @param props.filters - Current filter parameters.
 * @param props.updateFilters - Dispatch function for filter updates.
 * @param props.compact - Toggle for high-density layout.
 * @returns Filter UI fragment.
 */
export function SearchFilters({
  type,
  filters,
  updateFilters,
  compact = false,
}: SearchFiltersProps) {
  const { state: { category } } = useTierListContext();
  const service = getMediaService(category || 'music');
  const dynamicFilters = service.getFilters(type);

  // Helper wrappers for Album filters (Special handling for MusicBrainz legacy filter components)
  const togglePrimaryType = (t: string) => {
    const current = filters.albumPrimaryTypes as string[];
    const newTypes = current.includes(t) ? current.filter((x: string) => x !== t) : [...current, t];
    updateFilters({ albumPrimaryTypes: newTypes });
  };

  const toggleSecondaryType = (t: string) => {
    const current = filters.albumSecondaryTypes as string[];
    const newTypes = current.includes(t) ? current.filter((x: string) => x !== t) : [...current, t];
    updateFilters({ albumSecondaryTypes: newTypes });
  };

  return (
    <div className={`space-y-3 ${compact ? 'text-[10px]' : ''}`}>
      {dynamicFilters.map((def) => {
        // 1. Handle Special Legacy/Custom Components first
        if (def.id === 'albumPrimaryTypes') {
          return (
            <AlbumFilters
              key={def.id}
              primaryTypes={(filters.albumPrimaryTypes as string[]) || []}
              secondaryTypes={(filters.albumSecondaryTypes as string[]) || []}
              onTogglePrimary={togglePrimaryType}
              onToggleSecondary={toggleSecondaryType}
              onResetPrimary={() => updateFilters({ albumPrimaryTypes: (def.default as string[]) || [] })}
              onResetSecondary={() => updateFilters({ albumSecondaryTypes: [] })}
              onSelectAllSecondary={() => {}} 
              compact={compact}
            />
          );
        }

        // 2. Generic Rendering by Type
        switch (def.type) {
          case 'picker': {
            return (
              <MediaPicker
                key={def.id}
                type={(def.pickerType || 'artist') as 'artist' | 'album' | 'author'}
                selectedItem={filters[def.id] as MediaSelection | null}
                onSelect={(item) => {
                   const patch: Partial<SearchParamsState> = { [def.id]: item };
                   // Special rule: if we pick an artist, reset the album
                   if (def.id === 'selectedArtist') patch.selectedAlbum = null;
                   updateFilters(patch);
                }}
                artistId={def.id === 'selectedAlbum' ? (filters.selectedArtist as ArtistSelection | null)?.id : undefined}
                placeholder={def.label}
                context={type}
              />
            );
          }

          case 'range': {
            // Specialized Range handling for Years vs Duration
            const isDuration = def.id === 'durationRange';
            const minKey = isDuration ? 'minDuration' : 'minYear';
            const maxKey = isDuration ? 'maxDuration' : 'maxYear';

            return (
              <div key={def.id}>
                <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
                  {def.label}
                </div>
                <DateRangeFilter
                  minYear={filters[minKey] as string}
                  maxYear={filters[maxKey] as string}
                  onMinYearChange={(val) => updateFilters({ [minKey]: val })}
                  onMaxYearChange={(val) => updateFilters({ [maxKey]: val })}
                  fromLabel={isDuration ? 'Min' : 'From Year'}
                  toLabel={isDuration ? 'Max' : 'To Year'}
                  compact={compact}
                />
              </div>
            );
          }

          case 'select': {
            return (
              <div key={def.id}>
                <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
                  {def.label}
                </div>
                <select
                  className={FILTER_INPUT_STYLES}
                  value={(filters[def.id] as string) || ''}
                  onChange={(e) => updateFilters({ [def.id]: e.target.value })}
                >
                  {def.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          case 'text': {
            return (
              <div key={def.id}>
                <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
                  {def.label}
                </div>
                <input
                  placeholder={def.placeholder}
                  className={FILTER_INPUT_STYLES}
                  value={(filters[def.id] as string) || ''}
                  onChange={(e) => updateFilters({ [def.id]: e.target.value })}
                />
              </div>
            );
          }

          default: {
            return null;
          }
        }
      })}
    </div>
  );
}
