'use client';

import { Eye, EyeOff, Search } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { useTierListContext } from '@/components/providers/TierListContext';
import '@/lib/database/providers'; // Bootstrap all database providers on first import
import { registry } from '@/lib/database/registry';
import { ProviderStatus } from '@/lib/database/types';
import { usePersistentState } from '@/lib/hooks';

import { SearchTab } from './SearchTab';

/**
 * The V2 sidebar component responsible for searching and filtering media items.
 * Driven entirely by the DatabaseRegistry and its registered providers.
 */
export function SearchPanel() {
  const {
    ui: { addedItemIds, showDetails: onInfo },
    actions: { locate: handleLocate },
  } = useTierListContext();

  // Wait for the registry to finish bootstrapping before reading providers.
  // This ensures we re-render once async provider registration completes.
  const [isRegistryReady, setIsRegistryReady] = useState(false);
  useEffect(() => {
    registry.waitUntilReady().then(() => setIsRegistryReady(true));
  }, []);

  // 1. Discover all providers from the registry
  const allProviders = registry.getAllProviders();
  
  // 2. Show all available providers that are READY.
  const availableProviders = useMemo(() => {
    return allProviders.filter(p => p.status === ProviderStatus.READY);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-compute when registry becomes ready
  }, [allProviders, isRegistryReady]);

  // 3. Provider selection
  const [providerId, setProviderId] = usePersistentState<string>(
    `moat-v2-search-provider`,
    availableProviders[0]?.id ?? '',
  );

  const selectedProvider = useMemo(() => {
    return availableProviders.find(p => p.id === providerId) || availableProviders[0];
  }, [availableProviders, providerId]);

  // 4. Entity selection (Tabs)
  const [activeEntityId, setActiveEntityId] = usePersistentState<string>(
    `moat-v2-search-entity-${providerId}`,
    selectedProvider?.entities[0]?.id ?? '',
  );

  const [showAdded, setShowAdded] = usePersistentState<boolean>('moat-search-show-added', true);

  // Ensure selection is valid
  React.useEffect(() => {
    if (selectedProvider && !selectedProvider.entities.some(e => e.id === activeEntityId)) {
      setActiveEntityId(selectedProvider.entities[0]?.id || '');
    }
  }, [selectedProvider, activeEntityId, setActiveEntityId]);

  if (availableProviders.length === 0) {
    return (
      <div className="sticky top-4 flex h-64 flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-500 italic shadow-2xl">
        No database providers available.
      </div>
    );
  }

  return (
    <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-4 text-white">
        <div className="flex items-center gap-2">
          <Search size={20} />
          <h2 className="text-xl font-bold">Search</h2>
        </div>

        <div className="ml-auto flex items-center gap-2">
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

      {/* Provider Toggle (Database selection) */}
      {availableProviders.length > 1 && (
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <span className="text-[10px] font-medium text-neutral-500">Database:</span>
          <div className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-black p-0.5">
            {availableProviders.map((p) => (
              <button
                key={p.id}
                onClick={() => setProviderId(p.id)}
                className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
                  providerId === p.id
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Entity Tabs (Tabs driven by selected provider) */}
      {selectedProvider && selectedProvider.entities.length > 0 && (
        <div className="mb-4 flex shrink-0 gap-1 rounded-lg border border-neutral-800 bg-black p-1">
          {selectedProvider.entities.map((entity) => {
            const { branding } = entity;
            const Icon = branding.icon;
            const isActive = activeEntityId === entity.id;

            return (
              <button
                key={entity.id}
                onClick={() => setActiveEntityId(entity.id)}
                title={`Search ${branding.labelPlural}`}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${isActive ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'} `}
              >
                <Icon size={12} className={isActive ? branding.colorClass : ''} />
                <span>{branding.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {selectedProvider?.entities.map((entity) => (
          <SearchTab
            key={`${providerId}-${entity.id}`}
            providerId={providerId}
            entityId={entity.id}
            addedItemIds={addedItemIds}
            onLocate={handleLocate}
            isHidden={activeEntityId !== entity.id}
            showAdded={showAdded}
            onInfo={onInfo}
          />
        ))}
      </div>
    </div>
  );
}
