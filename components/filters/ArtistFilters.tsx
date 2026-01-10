import { ARTIST_TYPES } from '@/lib/types';

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
  if (compact) {
    return (
        <div className={`flex gap-2 ${className}`}>
            <div className="flex-1 min-w-0">
                <select 
                    value={type} 
                    onChange={(e) => onTypeChange(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300 outline-none focus:border-red-600 text-[10px]"
                >
                    <option value="">Type</option>
                    {ARTIST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div className="flex-1 min-w-0">
                <input
                    placeholder="Country"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300 outline-none focus:border-red-600 text-[10px]"
                    value={country}
                    onChange={(e) => onCountryChange(e.target.value)}
                />
            </div>
        </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-2 ${className}`}>
        <div className="grid grid-cols-1 gap-2">
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
