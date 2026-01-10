import { ARTIST_TYPES, ARTIST_GENDERS } from '@/lib/types';

interface ArtistFiltersProps {
  type: string;
  gender: string;
  country: string;
  onTypeChange: (val: string) => void;
  onGenderChange: (val: string) => void;
  onCountryChange: (val: string) => void;
  className?: string;
}

export function ArtistFilters({
  type,
  gender,
  country,
  onTypeChange,
  onGenderChange,
  onCountryChange,
  className = ""
}: ArtistFiltersProps) {
  return (
    <div className={`grid grid-cols-1 gap-2 ${className}`}>
        <div className="grid grid-cols-2 gap-2">
            <div>
                <select 
                    value={type} 
                    onChange={(e) => onTypeChange(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300 outline-none focus:border-red-600 text-[10px]"
                >
                    <option value="">Type</option>
                    {ARTIST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div>
                <select 
                    value={gender} 
                    onChange={(e) => onGenderChange(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300 outline-none focus:border-red-600 text-[10px]"
                >
                    <option value="">Gender</option>
                    {ARTIST_GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>
        </div>
        <div>
            <input
                placeholder="Country (e.g. US, GB, JP)"
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300 outline-none focus:border-red-600 text-[10px]"
                value={country}
                onChange={(e) => onCountryChange(e.target.value)}
            />
        </div>
    </div>
  );
}
