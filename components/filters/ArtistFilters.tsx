import { ARTIST_TYPES } from '@/lib/types';
import { FilterRow, FilterCol, FILTER_INPUT_STYLES } from './FilterPrimitives';

interface ArtistFiltersProps {
  type: string;
  country: string;
  onTypeChange: (val: string) => void;
  onCountryChange: (val: string) => void;
  className?: string;
  compact?: boolean;
}

export function ArtistFilters({
  type,
  country,
  onTypeChange,
  onCountryChange,
  className = "",
  compact = false
}: ArtistFiltersProps) {
  return (
    <FilterRow compact={compact} className={className}>
        <FilterCol>
            <select 
                value={type} 
                onChange={(e) => onTypeChange(e.target.value)}
                className={FILTER_INPUT_STYLES}
            >
                <option value="">Type</option>
                {ARTIST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
        </FilterCol>
        <FilterCol>
            <input
                placeholder={compact ? "Country" : "Country (e.g. US, GB, JP)"}
                className={FILTER_INPUT_STYLES}
                value={country}
                onChange={(e) => onCountryChange(e.target.value)}
            />
        </FilterCol>
    </FilterRow>
  );
}
