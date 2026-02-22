/**
 * @file SearchPanel.tsx
 * @description The sidebar component responsible for searching and filtering media items.
 * When a category has multiple services (e.g., RAWG/IGDB for games),
 * the available tabs, filters, and sort options are driven by the selected service.
 * @module SearchPanel
 */

'use client';

import { Eye, EyeOff, Search } from 'lucide-react';
import React, { useMemo } from 'react';

import { useTierListContext } from '@/components/providers/TierListContext';
import { useUserPreferences } from '@/components/providers/UserPreferencesProvider';
import { usePersistentState } from '@/lib/hooks';
import { mediaTypeRegistry } from '@/lib/media-types';
import { MediaType } from '@/lib/types';

import { SearchSettings } from './SearchSettings';
import { SearchTab } from './SearchTab';

/**
 * The sidebar component responsible for searching and filtering media items.
 * Derives available tabs from the selected service when multiple services exist.
 * @returns The rendered SearchPanel component.
 */
export function SearchPanel() {
  const {
    state: { category },
    ui: { addedItemIds, showDetails: onInfo },
    actions: { locate: handleLocate },
  } = useTierListContext();

  const { showAdvanced } = useUserPreferences();

  const currentCategory = category || 'music';
  const categoryConfig = mediaTypeRegistry.getCategory(currentCategory);
  const hasMultipleServices = (categoryConfig?.services?.length ?? 0) > 1;

  // Service selection (only meaningful when multiple services exist)
  const [serviceId, setServiceId] = usePersistentState<string>(
    `moat-search-service-${currentCategory}`,
    categoryConfig?.services?.[0]?.id ?? '',
  );

  // Derive supported types from the selected service, or fall back to static category types
  const supportedTypes = useMemo(() => {
    if (hasMultipleServices && categoryConfig?.services) {
      const selectedService = categoryConfig.services.find((s) => s.id === serviceId);
      if (selectedService) return selectedService.types;
      // Fallback to first service if saved serviceId is invalid
      return categoryConfig.services[0].types;
    }
    return mediaTypeRegistry.getByCategory(currentCategory).map((def) => def.id);
  }, [currentCategory, hasMultipleServices, categoryConfig, serviceId]);

  const [activeType, setActiveType] = usePersistentState<MediaType>(
    `moat-search-active-type-${currentCategory}-${serviceId}`, // Namespace by category AND service
    supportedTypes[0],
  );
  const [showAdded, setShowAdded] = usePersistentState<boolean>('moat-search-show-added', true);

  // Global Search Settings (Synchronized across all tabs and filters)
  const [fuzzy, setFuzzy] = usePersistentState<boolean>('moat-search-fuzzy', true);
  const [wildcard, setWildcard] = usePersistentState<boolean>('moat-search-wildcard', true);

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
        </div>
      </div>

      {/* Service Toggle (only shown when multiple services exist) */}
      {hasMultipleServices && categoryConfig?.services && (
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <span className="text-[10px] font-medium text-neutral-500">Database:</span>
          <div className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-black p-0.5">
            {categoryConfig.services.map((s) => (
              <button
                key={s.id}
                onClick={() => setServiceId(s.id)}
                className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
                  serviceId === s.id
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Media Type Tabs (driven by selected service) */}
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
            key={`${serviceId}-${type}`}
            type={type}
            addedItemIds={addedItemIds}
            onLocate={handleLocate}
            isHidden={activeType !== type}
            showAdded={showAdded}
            globalFuzzy={fuzzy}
            globalWildcard={wildcard}
            serviceId={serviceId}
            onInfo={onInfo}
          />
        ))}
      </div>
    </div>
  );
}

