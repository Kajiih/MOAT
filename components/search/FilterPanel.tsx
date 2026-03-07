import React from 'react';

import { DatabaseEntity } from '@/lib/database/types';
import { FallbackFilterInput, FilterUIComponents } from './filters';

interface FilterPanelProps {
  entity: DatabaseEntity;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

/**
 * A purely declarative filter panel that renders UI controls based on 
 * the FilterDefinitions provided by a DatabaseEntity.
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
        const Component = FilterUIComponents[filter.type] || FallbackFilterInput;

        return (
          <div key={filter.id} className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-neutral-500">
              {filter.label}
            </label>
            
            <Component 
              filter={filter} 
              value={value} 
              onChange={(val) => handleFilterChange(filter.id, val)} 
            />
            
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
