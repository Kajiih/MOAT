/**
 * @file SearchPanel.tsx
 * @description The sidebar component responsible for searching and filtering media items.
 * It manages the active tab (Album/Artist/Song), global search settings, and renders persistent SearchTabs.
 * @module SearchPanel
 */

'use client';

import { Eye, EyeOff, Search } from 'lucide-react';
import React from 'react';

import { useTierListContext } from '@/components/providers/TierListContext';
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider';
import { usePersistentState } from '@/lib/hooks';
import { mediaTypeRegistry } from '@/lib/media-types';
import { MediaType } from '@/lib/types';

import { SearchSettings } from './SearchSettings';
import { SearchTab } from './SearchTab';

/**
 * The sidebar component responsible for searching and filtering media items.
 * It manages the active tab (Album/Artist/Song) and renders persistant SearchTabs for each.
 */

/**
 * The sidebar component responsible for searching and filtering media items.
 * It manages the active tab (Album/Artist/Song) and renders persistant SearchTabs for each.
 * @returns The rendered SearchPanel component.
 */
export function SearchPanel() {
  const {
    state: { category },
    ui: { addedItemIds, showDetails: onInfo },
    actions: { locate: handleLocate },
  } = useTierListContext();

  const { showAdvanced } = useUserPreferences();

  // Get supported types for current category from registry
  const supportedTypes = mediaTypeRegistry.getByCategory(category || 'music').map((def) => def.id);

  const [activeType, setActiveType] = usePersistentState<MediaType>(
    `moat-search-active-type-${category || 'music'}`, // Namespace by category
    supportedTypes[0],
  );
  const [showAdded, setShowAdded] = usePersistentState<boolean>('moat-search-show-added', true);

  // Global Search Settings (Synchronized across all tabs and filters)
  const [fuzzy, setFuzzy] = usePersistentState<boolean>('moat-search-fuzzy', true);
  const [wildcard, setWildcard] = usePersistentState<boolean>('moat-search-wildcard', true);
  const [service, setService] = usePersistentState<string>(
    `moat-search-service-${category || 'music'}`,
    category === 'game' ? 'rawg' : '',
  );

  // Ensure active type is valid for current service
  React.useEffect(() => {
    if (!supportedTypes.includes(activeType)) {
      setActiveType(supportedTypes[0]);
    }
  }, [supportedTypes, activeType, setActiveType]);

  return (
    <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-4 text-white">
        <div className="flex items-center gap-2">
          <Search size={20} />
          <h2 className="text-xl font-bold">Search</h2>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {showAdvanced && (
            <SearchSettings
              fuzzyEnabled={fuzzy}
              wildcardEnabled={wildcard}
              onFuzzyChange={setFuzzy}
              onWildcardChange={setWildcard}
            />
          )}

          <button
            onClick={() => setShowAdded(!showAdded)}
            className={`flex items-center gap-2 rounded border px-2 py-1 text-[10px] font-medium transition-colors ${showAdded ? 'border-neutral-600 bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'border-blue-900/40 bg-blue-900/10 text-blue-400'}`}
            title={
              showAdded ? 'Hide items already on the board' : 'Show items already on the board'
            }
          >
            {showAdded ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>{showAdded ? 'Hide Added' : 'Show Added'}</span>
          </button>

          {category === 'game' && (
            <div className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-black p-0.5">
              {['rawg', 'igdb'].map((s) => (
                <button
                  key={s}
                  onClick={() => setService(s)}
                  className={`rounded px-2 py-1 text-[10px] font-bold uppercase transition-all ${
                    service === s
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex shrink-0 gap-1 rounded-lg border border-neutral-800 bg-black p-1">
        {supportedTypes.map((type: MediaType) => {
          const config = mediaTypeRegistry.get(type);
          const Icon = config.icon;
          const isActive = activeType === type;

          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              title={`Search ${config.label}s`}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${isActive ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'} `}
            >
              <Icon size={12} />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {supportedTypes.map((type: MediaType) => (
          <SearchTab
            key={type}
            type={type}
            addedItemIds={addedItemIds}
            onLocate={handleLocate}
            isHidden={activeType !== type}
            showAdded={showAdded}
            globalFuzzy={fuzzy}
            globalWildcard={wildcard}
            serviceId={service}
            onInfo={onInfo}
          />
        ))}
      </div>
    </div>
  );
}
