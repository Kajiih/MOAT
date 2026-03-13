/**
 * @file Filter Inputs
 * @description Low-level presentation components governing diverse individual filter mechanisms.
 */

import React from 'react';

import {
  BooleanFilterDefinition,
  MultiSelectFilterDefinition,
  RangeFilterDefinition,
  SelectFilterDefinition,
  TextFilterDefinition,
} from '@/search/filter-schemas';

import { FilterControlProps } from './types';

/**
 * Renders a text input for string-based filters.
 * @param props - The filter control properties.
 * @param props.filter - The filter definition parameters.
 * @param props.value - The current string input state.
 * @param props.onChange - Functional callback resolving the updated state.
 * @returns A fully bound input node.
 */
export function TextFilterInput({
  filter,
  value,
  onChange,
}: FilterControlProps<TextFilterDefinition>) {
  return (
    <input
      type="text"
      placeholder={filter.placeholder}
      className="w-full rounded-md border border-border bg-black px-2 py-1.5 text-xs text-white outline-none focus:border-red-600"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/**
 * Renders a select dropdown for categorical filters.
 * @param props - The filter control properties.
 * @param props.filter - The filter definition containing the option suite.
 * @param props.value - The currently selected option ID.
 * @param props.onChange - Functional callback resolving the updated option.
 * @returns A fully bound select node.
 */
export function SelectFilterInput({
  filter,
  value,
  onChange,
}: FilterControlProps<SelectFilterDefinition>) {
  return (
    <select
      className="w-full rounded-md border border-border bg-black px-2 py-1.5 text-xs text-white outline-none focus:border-red-600"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Any</option>
      {filter.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Renders a checkbox for boolean filters.
 * @param props - The filter control properties.
 * @param props.value - The current boolean state.
 * @param props.onChange - Functional callback executing the toggle behavior.
 * @returns A fully bound toggle node.
 */
export function BooleanFilterInput({
  value,
  onChange,
}: FilterControlProps<BooleanFilterDefinition>) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        className="h-4 w-4 rounded-md border-border bg-black text-red-600"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-xs text-secondary">Enabled</span>
    </div>
  );
}

/**
 * Renders a multi-select token group for array filters.
 * @param props - The filter control properties.
 * @param props.filter - The filter definition containing the available parameters.
 * @param props.value - The currently selected array of tokens.
 * @param props.onChange - Functional callback resolving the modified selection array.
 * @returns A fully bound multiselect grid node.
 */
export function MultiSelectFilterInput({
  filter,
  value,
  onChange,
}: FilterControlProps<MultiSelectFilterDefinition>) {
  return (
    <div className="flex flex-wrap gap-2">
      {filter.options?.map((opt) => {
        const optVal = String(opt.value);
        const isChecked = Array.isArray(value) && value.includes(optVal);
        return (
          <button
            key={opt.value}
            onClick={() => {
              const current = Array.isArray(value) ? value : [];
              const next = isChecked
                ? current.filter((v) => v !== optVal)
                : [...current, optVal];
              onChange(next);
            }}
            className={`rounded-md border px-2 py-1 text-caption transition-colors ${
              isChecked
                ? 'border-red-900 bg-red-900/20 text-red-400'
                : 'border-border bg-black text-secondary hover:text-neutral-400'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Renders min/max inputs for range filters.
 * @param props - The filter control properties.
 * @param props.filter - The defined filtering boundaries.
 * @param props.value - The current min/max coordinates.
 * @param props.onChange - Functional callback mutating the selected range.
 * @returns A fully bound multi-input node.
 */
export function RangeFilterInput({
  filter,
  value,
  onChange,
}: FilterControlProps<RangeFilterDefinition>) {
  const minVal = value?.min || '';
  const maxVal = value?.max || '';

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder={filter.minPlaceholder || 'Min'}
        className="w-full rounded-md border border-border bg-black px-2 py-1.5 text-xs text-white outline-none focus:border-red-600"
        value={minVal}
        onChange={(e) => onChange({ ...value, min: e.target.value })}
      />
      <span className="text-secondary">-</span>
      <input
        type="text"
        placeholder={filter.maxPlaceholder || 'Max'}
        className="w-full rounded-md border border-border bg-black px-2 py-1.5 text-xs text-white outline-none focus:border-red-600"
        value={maxVal}
        onChange={(e) => onChange({ ...value, max: e.target.value })}
      />
    </div>
  );
}
