/**
 * @file SortDropdown.tsx
 * @description A dropdown component for selecting the sort order of search results.
 * Adapts available sort options based on the media type (e.g., Duration sorting only for songs).
 * @module SortDropdown
 */

import { ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

import { MediaType, SortOption } from '@/lib/types';

/**
 * Props for the SortDropdown component.
 */
interface SortDropdownProps {
  /** The current active sort option. */
  sortOption: SortOption;
  /** Callback fired when a new sort option is selected. */
  onSortChange: (option: SortOption) => void;
  /** The type of media being sorted, which affects available options. */
  type?: MediaType;
}

/**
 * Renders a dropdown menu for selecting search result sorting preferences.
 * @param props - The props for the component.
 * @param props.sortOption
 * @param props.onSortChange
 * @param props.type
 */
export function SortDropdown({ sortOption, onSortChange, type }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const OPTIONS: { id: SortOption; label: string }[] = [
    { id: 'relevance', label: 'Relevance' },
    { id: 'date_desc', label: 'Date (Newest)' },
    { id: 'date_asc', label: 'Date (Oldest)' },
    { id: 'title_asc', label: 'Name (A-Z)' },
    { id: 'title_desc', label: 'Name (Z-A)' },
  ];

  if (type === 'song') {
    OPTIONS.push(
      { id: 'duration_desc', label: 'Duration (Longest)' },
      { id: 'duration_asc', label: 'Duration (Shortest)' },
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded border p-2 transition-colors ${isOpen ? 'border-neutral-600 bg-neutral-800 text-white' : 'border-neutral-700 bg-black text-neutral-400 hover:text-white'}`}
        title="Sort Results"
      >
        <ArrowUpDown size={18} />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-2 flex w-48 flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 p-1 shadow-xl">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                onSortChange(opt.id);
                setIsOpen(false);
              }}
              className={`rounded px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-800 ${sortOption === opt.id ? 'bg-neutral-800 font-bold text-white' : 'text-neutral-400'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
