/**
 * @file SortDropdown.tsx
 * @description A dropdown component for selecting the sort order of search results.
 * Adapts available sort options based on the media type (e.g., Duration sorting only for songs).
 * @module SortDropdown
 */

import { ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

import { MediaType } from '@/lib/types';

import { Popover } from './Popover';

interface SortOptionItem {
  label: string;
  value: string;
}

/**
 * Props for the SortDropdown component.
 */
interface SortDropdownProps {
  /** The current active sort option. */
  sortOption: string;
  /** Callback fired when a new sort option is selected. */
  onSortChange: (option: string) => void;
  /** The type of media being sorted, which affects available options. */
  type?: MediaType;
  /** Dynamic sort options from the media service. */
  options?: SortOptionItem[];
}

/**
 * Renders a dropdown menu for selecting search result sorting preferences.
 * @param props - The props for the component.
 * @param props.sortOption - The current active sort option.
 * @param props.onSortChange - Callback fired when a new sort option is selected.
 * @param props.type - The type of media being sorted, which affects available options.
 * @param props.options - Dynamic sort options from the media service.
 * @returns The rendered SortDropdown component.
 */
export function SortDropdown({ sortOption, onSortChange, type, options }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const defaultOptions: { value: string; label: string }[] = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'date_desc', label: 'Date (Newest)' },
    { value: 'date_asc', label: 'Date (Oldest)' },
    { value: 'title_asc', label: 'Name (A-Z)' },
    { value: 'title_desc', label: 'Name (Z-A)' },
  ];

  const finalOptions = options || defaultOptions;

  // For backward compatibility if options not provided but type is song
  if (!options && type === 'song' && !finalOptions.some(o => o.value === 'duration_desc')) {
    finalOptions.push(
      { value: 'duration_desc', label: 'Duration (Longest)' },
      { value: 'duration_asc', label: 'Duration (Shortest)' },
    );
  }

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      contentClassName="top-full right-0"
      trigger={
        <button
          className={`rounded border p-2 transition-colors ${isOpen ? 'border-neutral-600 bg-neutral-800 text-white' : 'border-neutral-700 bg-black text-neutral-400 hover:text-white'}`}
          title="Sort Results"
        >
          <ArrowUpDown size={18} />
        </button>
      }
    >
      <div className="flex w-48 flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 p-1 shadow-xl">
        {finalOptions.map((opt: SortOptionItem) => (
          <button
            key={opt.value}
            onClick={() => {
              onSortChange(opt.value);
              setIsOpen(false);
            }}
            className={`rounded px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-800 ${sortOption === opt.value ? 'bg-neutral-800 font-bold text-white' : 'text-neutral-400'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </Popover>
  );
}

