import { MediaType } from '@/lib/types';
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
  videoOnly: boolean; setVideoOnly: (v: boolean) => void;
}

interface SearchFiltersProps {
  type: MediaType;
  state: SearchFiltersState;
  compact?: boolean;
}

export function SearchFilters({ type, state, compact = false }: SearchFiltersProps) {
  
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
                compact={compact}
            />
        )}

        {/* Common Date Filter */}
        <DateRangeFilter
            minYear={state.minYear}
            maxYear={state.maxYear}
            onMinYearChange={state.setMinYear}
            onMaxYearChange={state.setMaxYear}
            fromLabel={type === 'artist' ? 'Est. From' : 'From Year'}
            toLabel={type === 'artist' ? 'Est. To' : 'To Year'}
            compact={compact}
        />

        {/* Common Tag Filter */}
        <div>
            {!compact && <label className="text-[10px] text-neutral-500 uppercase font-bold mb-1 block">Tag / Genre</label>}
            <input
                placeholder={compact ? "Tag / Genre" : "e.g. rock, jazz, 80s..."}
                className={FILTER_INPUT_STYLES}
                value={state.tag}
                onChange={e => state.setTag(e.target.value)}
            />
        </div>

        {/* Song Specific */}
        {type === 'song' && (
            <div className="flex items-center gap-2 pt-1">
                <input 
                    type="checkbox" 
                    id={`videoOnly-${compact ? 'compact' : 'full'}`}
                    checked={state.videoOnly}
                    onChange={(e) => state.setVideoOnly(e.target.checked)}
                    className="accent-red-600"
                />
                <label htmlFor={`videoOnly-${compact ? 'compact' : 'full'}`} className="text-xs text-neutral-300 cursor-pointer select-none">
                    Has Video (Music Video)
                </label>
            </div>
        )}
    </div>
  );
}
