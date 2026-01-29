/**
 * @file SearchFilters.tsx
 * @description Renders a collection of dynamic filter components based on the active media service.
 * @module SearchFilters
 */

import { MediaPicker } from '@/components/media/MediaPicker';
import { useTierListContext } from '@/components/providers/TierListContext';
import { SearchParamsState } from '@/components/search/hooks/useMediaSearch';
import { getMediaService } from '@/lib/services/factory';
import { MediaType } from '@/lib/types';

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
    const current = filters.albumPrimaryTypes;
    const newTypes = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    updateFilters({ albumPrimaryTypes: newTypes });
  };

  const toggleSecondaryType = (t: string) => {
    const current = filters.albumSecondaryTypes;
    const newTypes = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    updateFilters({ albumSecondaryTypes: newTypes });
  };

  return (
    <div className={`space-y-3 ${compact ? 'text-[10px]' : ''}`}>
      {dynamicFilters.map((def) => {
        switch (def.id) {
          case 'selectedArtist': {
            return (
              <MediaPicker
                key={def.id}
                type="artist"
                selectedItem={filters.selectedArtist}
                onSelect={(a) => updateFilters({ 
                  selectedArtist: a,
                  selectedAlbum: null // Reset album if artist changes
                })}
                placeholder={def.label}
                context={type}
              />
            );
          }
          case 'selectedAlbum': {
            return (
              <MediaPicker
                key={def.id}
                type="album"
                selectedItem={filters.selectedAlbum}
                onSelect={(a) => updateFilters({ selectedAlbum: a })}
                artistId={filters.selectedArtist?.id}
                placeholder={def.label}
                context="song-filter"
              />
            );
          }
          case 'yearRange': {
            return (
              <div key={def.id}>
                <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
                  {def.label}
                </div>
                <DateRangeFilter
                  minYear={filters.minYear}
                  maxYear={filters.maxYear}
                  onMinYearChange={(val) => updateFilters({ minYear: val })}
                  onMaxYearChange={(val) => updateFilters({ maxYear: val })}
                  fromLabel="From Year"
                  toLabel="To Year"
                  compact={compact}
                />
              </div>
            );
          }
          case 'durationRange': {
            return (
              <div key={def.id}>
                <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
                  {def.label}
                </div>
                <div className={`flex gap-2 ${compact ? '' : 'grid grid-cols-2'}`}>
                  <input
                    placeholder="Min Sec"
                    type="number"
                    className={FILTER_INPUT_STYLES}
                    value={filters.minDuration}
                    onChange={(e) => updateFilters({ minDuration: e.target.value })}
                  />
                  <input
                    placeholder="Max Sec"
                    type="number"
                    className={FILTER_INPUT_STYLES}
                    value={filters.maxDuration}
                    onChange={(e) => updateFilters({ maxDuration: e.target.value })}
                  />
                </div>
              </div>
            );
          }
          case 'artistType': {
            return (
               <div key={def.id}>
                 <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
                   {def.label}
                 </div>
                 <select
                   className={FILTER_INPUT_STYLES}
                   value={filters.artistType}
                   onChange={(e) => updateFilters({ artistType: e.target.value })}
                 >
                   {def.options?.map(opt => (
                     <option key={opt.value} value={opt.value}>{opt.label}</option>
                   ))}
                 </select>
               </div>
            );
          }
          case 'albumPrimaryTypes': {
            return (
              <AlbumFilters
                key={def.id}
                primaryTypes={filters.albumPrimaryTypes}
                secondaryTypes={filters.albumSecondaryTypes}
                onTogglePrimary={togglePrimaryType}
                onToggleSecondary={toggleSecondaryType}
                onResetPrimary={() => updateFilters({ albumPrimaryTypes: (def.default as string[]) || [] })}
                onResetSecondary={() => updateFilters({ albumSecondaryTypes: [] })}
                onSelectAllSecondary={() => {}} // Not strictly handled here yet
                compact={compact}
              />
            );
          }
          case 'tag': {
            return (
              <div key={def.id}>
                <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
                  {def.label}
                </div>
                <input
                  placeholder={def.placeholder}
                  className={FILTER_INPUT_STYLES}
                  value={filters.tag}
                  onChange={(e) => updateFilters({ tag: e.target.value })}
                />
              </div>
            );
          }
          case 'artistCountry': {
              return (
                <div key={def.id}>
                  <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
                    {def.label}
                  </div>
                  <input
                    placeholder={def.placeholder}
                    className={FILTER_INPUT_STYLES}
                    value={filters.artistCountry}
                    onChange={(e) => updateFilters({ artistCountry: e.target.value })}
                  />
                </div>
              );
          }
          case 'selectedAuthor': {
            return (
              <MediaPicker
                key={def.id}
                type="artist"
                selectedItem={filters.selectedAuthor}
                onSelect={(a) => updateFilters({ selectedAuthor: a })}
                placeholder={def.label}
                context={type}
              />
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
