'use client';

import React from 'react';

import { DatabaseEntity } from '@/lib/database/types';

interface FilterPanelProps {
  entity: DatabaseEntity;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

/**
 * A purely declarative filter panel that renders UI controls based on 
 * the FilterDefinitions provided by a DatabaseEntity.
 * @param root0
 * @param root0.entity
 * @param root0.values
 * @param root0.onChange
 */
export function FilterPanel({ entity, values, onChange }: FilterPanelProps) {
  const allFilters = [...entity.searchOptions, ...entity.filters];

  const handleFilterChange = (id: string, value: unknown) => {
    onChange({
      ...values,
      [id]: value,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {allFilters.map((filter) => {
        const value = values[filter.id] ?? filter.defaultValue;

        return (
          <div key={filter.id} className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-neutral-500">
              {filter.label}
            </label>
            
            {renderFilterInput(filter, value, (val) => handleFilterChange(filter.id, val))}
            
            {filter.helperText && (
              <span className="text-[9px] text-neutral-600 italic">
                {filter.helperText}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helper to render the appropriate input component for a filter type.
 * @param filter
 * @param value
 * @param onChange
 */
function renderFilterInput(
  filter: any, // FilterDefinition
  value: any,
  onChange: (val: any) => void
) {
  switch (filter.type) {
    case 'text': {
      return (
        <input
          type="text"
          placeholder={filter.placeholder}
          className="w-full rounded border border-neutral-700 bg-black px-2 py-1.5 text-xs text-white outline-none focus:border-red-600"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }

    case 'select': {
      return (
        <select
          className="w-full rounded border border-neutral-700 bg-black px-2 py-1.5 text-xs text-white outline-none focus:border-red-600"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Any</option>
          {filter.options?.map((opt: any) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    case 'boolean': {
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-neutral-700 bg-black text-red-600"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="text-xs text-neutral-400">Enabled</span>
        </div>
      );
    }

    case 'multiselect': {
      // Basic implementation using a group of checkboxes for now
      return (
        <div className="flex flex-wrap gap-2">
          {filter.options?.map((opt: any) => {
            const isChecked = Array.isArray(value) && value.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  const next = isChecked
                    ? current.filter((v) => v !== opt.value)
                    : [...current, opt.value];
                  onChange(next);
                }}
                className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                  isChecked
                    ? 'border-red-900 bg-red-900/20 text-red-400'
                    : 'border-neutral-800 bg-black text-neutral-500 hover:text-neutral-400'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    default: {
      return (
        <div className="text-[10px] text-neutral-600 italic">
          UI for {filter.type} not implemented yet
        </div>
      );
    }
  }
}
