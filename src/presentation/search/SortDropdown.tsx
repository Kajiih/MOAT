/**
 * @file SortDropdown.tsx
 * @description A dropdown component for selecting the sort order of search results.
 * Adapts available sort options based on the entity type (e.g., Duration sorting only for songs).
 * @module SortDropdown
 */

import { ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

import { Popover } from '@/lib/ui/Popover';
import { SortDirection } from '@/presentation/search/sort-schemas';

interface SortOptionItem {
  label: string;
  value: string;
  defaultDirection?: SortDirection;
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
  type?: string;
  /** Dynamic sort options from the provider. */
  options?: SortOptionItem[];
}

/**
 * Renders a dropdown menu for selecting search result sorting preferences.
 * @param props - The props for the component.
 * @param props.sortOption - The current active sort option.
 * @param props.onSortChange - Callback fired when a new sort option is selected.
 * @param props.type - The type of media being sorted, which affects available options.
 * @param props.options - Dynamic sort options from the provider.
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
  if (!options && type === 'song' && !finalOptions.some((o) => o.value === 'duration_desc')) {
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
          className={`rounded-md border p-2 transition-colors ${isOpen ? 'border-border bg-surface-hover text-foreground' : 'border-border text-secondary hover:text-foreground bg-black'}`}
          title="Sort Results"
        >
          <ArrowUpDown size={18} />
        </button>
      }
    >
      <div className="border-border bg-surface shadow-elevated flex w-48 flex-col overflow-hidden rounded-lg border p-1">
        {finalOptions.map((opt: SortOptionItem) => (
          <button
            key={opt.value}
            onClick={() => {
              onSortChange(opt.value);
              setIsOpen(false);
            }}
            className={`hover:bg-surface rounded-md px-3 py-2 text-left text-xs transition-colors ${sortOption === opt.value ? 'bg-surface-hover text-foreground font-bold' : 'text-secondary'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </Popover>
  );
}
