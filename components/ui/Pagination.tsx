/**
 * @file Pagination.tsx
 * @description Reusable pagination control component.
 * Displays Previous/Next buttons and the current page status.
 * Used primarily in the Search Panel.
 * @module Pagination
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-4 mt-6">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="p-1 rounded bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700"
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
        className="p-1 rounded bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700"
        title="Next Page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
