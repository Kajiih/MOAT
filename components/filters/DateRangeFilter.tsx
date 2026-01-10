import { ChangeEvent } from 'react';

interface DateRangeFilterProps {
  minYear: string;
  maxYear: string;
  onMinYearChange: (value: string) => void;
  onMaxYearChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
}

export function DateRangeFilter({
  minYear,
  maxYear,
  onMinYearChange,
  onMaxYearChange,
  fromLabel = "From Year",
  toLabel = "To Year",
  className = ""
}: DateRangeFilterProps) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      <div>
         <input
            placeholder={fromLabel}
            type="number"
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300 outline-none focus:border-red-600 text-[10px]"
            value={minYear}
            onChange={(e) => onMinYearChange(e.target.value)}
        />
      </div>
      <div>
         <input
            placeholder={toLabel}
            type="number"
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300 outline-none focus:border-red-600 text-[10px]"
            value={maxYear}
            onChange={(e) => onMaxYearChange(e.target.value)}
        />
      </div>
    </div>
  );
}
