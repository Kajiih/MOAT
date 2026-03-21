/**
 * @file Filter Panel
 * @description Purely declarative filter panel that renders UI controls.
 */

import React from 'react';

import { Entity } from '@/domain/providers/types';
import { FilterValues } from '@/presentation/search/filter-schemas';

import { FallbackFilterInput, FilterUIComponents } from './filters/index';

interface FilterPanelProps {
  providerId: string;
  entity: Entity;
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}

/**
 * A purely declarative filter panel that renders UI controls based on
 * the FilterDefinitions provided by a Entity.
 * @param props - The component properties.
 * @param props.providerId - The ID of the provider sourcing the entity, used for linked entity lookups.
 * @param props.entity - The entity containing the filter definitions.
 * @param props.values - The current filter values dictionary.
 * @param props.onChange - Callback invoked when a filter value is changed.
 * @returns The rendered filter panel component.
 */
export function FilterPanel({ providerId, entity, values, onChange }: FilterPanelProps) {
  const allFilters = [...entity.searchOptions, ...entity.filters];

  const handleFilterChange = (id: string, value: FilterValues[string]) => {
    onChange({
      ...values,
      [id]: value,
    });
  };

  return (
    <div className="flex flex-wrap items-start gap-3">
      {allFilters.map((filter) => {
        const value = values[filter.id] ?? filter.defaultValue;
        const Component = FilterUIComponents[filter.type] || FallbackFilterInput;

        return (
          <div key={filter.id} className="flex min-w-[160px] flex-initial flex-col gap-1.5">
            <label className="text-caption text-secondary font-bold uppercase">
              {filter.label}
            </label>

            <Component
              providerId={providerId}
              filter={filter}
              value={value}
              onChange={(val: unknown) =>
                handleFilterChange(filter.id, val as FilterValues[string])
              }
              activeFilters={values}
            />

            {filter.helperText && (
              <span className="text-caption text-muted italic">{filter.helperText}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
