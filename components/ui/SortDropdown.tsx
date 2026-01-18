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
        className={`p-2 rounded border transition-colors ${isOpen ? 'bg-neutral-800 border-neutral-600 text-white' : 'bg-black border-neutral-700 text-neutral-400 hover:text-white'}`}
        title="Sort Results"
      >
        <ArrowUpDown size={18} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col p-1">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                onSortChange(opt.id);
                setIsOpen(false);
              }}
              className={`text-left px-3 py-2 text-xs rounded hover:bg-neutral-800 transition-colors ${sortOption === opt.id ? 'text-white font-bold bg-neutral-800' : 'text-neutral-400'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
