/**
 * @file Pagination.tsx
 * @description Reusable pagination control component.
 * Displays Previous/Next buttons and the current page status.
 * Used primarily in the Search Panel.
 * @module Pagination
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Props for the Pagination component.
 */
interface PaginationProps {
  /** The current active page number (1-based). */
  page: number;
  /** The total number of available pages. */
  totalPages: number;
  /** Callback fired when the page is changed. */
  onPageChange: (newPage: number) => void;
}

/**
 * Renders a compact navigation bar for switching between paginated result pages.
 * @param props - The props for the component.
 * @param props.page - The current active page number (1-based).
 * @param props.totalPages - The total number of available pages.
 * @param props.onPageChange - Callback fired when the page is changed.
 */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded bg-neutral-800 p-1 hover:bg-neutral-700 disabled:opacity-30"
        title="Previous Page"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-xs text-neutral-400">
        Page {page} of {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded bg-neutral-800 p-1 hover:bg-neutral-700 disabled:opacity-30"
        title="Next Page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
