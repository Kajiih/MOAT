/**
 * @file SearchFilters.tsx
 * @description A composite component that renders the appropriate filter inputs based on the selected Media Type.
 * Aggregates specific sub-filters (ArtistFilters, AlbumFilters) and common filters (DateRange, Tags) into a unified UI.
 * @module SearchFilters
 */

import { MediaType, SECONDARY_TYPES } from '@/lib/types';
import { ArtistFilters } from './ArtistFilters';
import { AlbumFilters } from './AlbumFilters';
import { DateRangeFilter } from './DateRangeFilter';
import { FILTER_INPUT_STYLES } from './FilterPrimitives';

interface SearchFiltersState {
  minYear: string; setMinYear: (v: string) => void;
  maxYear: string; setMaxYear: (v: string) => void;
  tag: string; setTag: (v: string) => void;
  
  // Artist
  artistType: string; setArtistType: (v: string) => void;
  artistCountry: string; setArtistCountry: (v: string) => void;
  
  // Album
  albumPrimaryTypes: string[]; setAlbumPrimaryTypes: (v: string[]) => void;
  albumSecondaryTypes: string[]; setAlbumSecondaryTypes: (v: string[]) => void;
  
  // Song
  minDuration: string; setMinDuration: (v: string) => void;
  maxDuration: string; setMaxDuration: (v: string) => void;
}

interface SearchFiltersProps {
  type: MediaType;
  state: SearchFiltersState;
  compact?: boolean;
  contextPickers?: React.ReactNode;
}

export function SearchFilters({ type, state, compact = false, contextPickers }: SearchFiltersProps) {
  
  // Helper wrappers for Album filters
  const togglePrimaryType = (t: string) => {
      const current = state.albumPrimaryTypes;
      const newTypes = current.includes(t) 
        ? current.filter(x => x !== t) 
        : [...current, t];
      state.setAlbumPrimaryTypes(newTypes);
  };

  const toggleSecondaryType = (t: string) => {
      const current = state.albumSecondaryTypes;
      const newTypes = current.includes(t) 
        ? current.filter(x => x !== t) 
        : [...current, t];
      state.setAlbumSecondaryTypes(newTypes);
  };

  return (
    <div className={`space-y-2 ${compact ? 'text-[10px]' : ''}`}>
        {contextPickers && (
            <div className="space-y-2 mb-2 pb-2 border-b border-neutral-800">
                {contextPickers}
            </div>
        )}
        
        {/* Type-Specific Filters */}
        {type === 'artist' && (
            <ArtistFilters 
                type={state.artistType}
                country={state.artistCountry}
                onTypeChange={state.setArtistType}
                onCountryChange={state.setArtistCountry}
                className={compact ? 'text-[10px]' : ''}
                compact={compact}
            />
        )}

        {type === 'album' && (
            <AlbumFilters 
                primaryTypes={state.albumPrimaryTypes}
                secondaryTypes={state.albumSecondaryTypes}
                onTogglePrimary={togglePrimaryType}
                onToggleSecondary={toggleSecondaryType}
                onResetPrimary={() => state.setAlbumPrimaryTypes(['Album', 'EP'])}
                onResetSecondary={() => state.setAlbumSecondaryTypes([])}
                onSelectAllSecondary={() => state.setAlbumSecondaryTypes([...SECONDARY_TYPES])}
                compact={compact}
            />
        )}

        {/* Common Date Filter */}
        <div>
            <div className="text-neutral-600 font-bold uppercase tracking-wider text-[9px] mb-1">
                {type === 'artist' ? 'Born / Formed' : 'Release Year'}
            </div>
            <DateRangeFilter
                minYear={state.minYear}
                maxYear={state.maxYear}
                onMinYearChange={state.setMinYear}
                onMaxYearChange={state.setMaxYear}
                fromLabel="From Year"
                toLabel="To Year"
                compact={compact}
            />
        </div>

        {/* Common Tag Filter */}
        <div>
            <div className="text-neutral-600 font-bold uppercase tracking-wider text-[9px] mb-1">Tag / Genre</div>
            <input
                placeholder={compact ? "Tag / Genre" : "e.g. rock, jazz, 80s..."}
                className={FILTER_INPUT_STYLES}
                value={state.tag}
                onChange={e => state.setTag(e.target.value)}
            />
        </div>

        {/* Song Specific */}
        {type === 'song' && (
            <div>
                <div className="text-neutral-600 font-bold uppercase tracking-wider text-[9px] mb-1">Duration (Seconds)</div>
                <div className={`flex gap-2 ${compact ? '' : 'grid grid-cols-2'}`}>
                    <input
                        placeholder="Min Sec"
                        type="number"
                        className={FILTER_INPUT_STYLES}
                        value={state.minDuration}
                        onChange={(e) => state.setMinDuration(e.target.value)}
                    />
                    <input
                        placeholder="Max Sec"
                        type="number"
                        className={FILTER_INPUT_STYLES}
                        value={state.maxDuration}
                        onChange={(e) => state.setMaxDuration(e.target.value)}
                    />
                </div>
            </div>
        )}
    </div>
  );
}
