/**
 * @file Search Panel
 * @description The top-level declarative search UI coordinating providers, filters, and rendering.
 */

'use client';

import '@/infra/providers/bootstrap'; // Bootstrap all providers on first import

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Eye, EyeOff, Loader2, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useTierListContext } from '@/features/board/context';
import { isDragItemData } from '@/features/board/types';
import { RegistryStatus } from '@/infra/providers/registry';
import { usePersistentState } from '@/infra/storage/usePersistentState';
import { useRegistry } from '@/presentation/hooks/useRegistry';

import { SearchTab } from './SearchTab';

/**
 * The sidebar component responsible for searching and filtering items.
 * Driven entirely by the ProviderRegistry and its registered providers.
 * @returns The rendered search panel sidebar component.
 */
export function SearchPanel() {
  const {
    ui: { addedItemIds, showDetails: onInfo },
    actions: { locate: handleLocate, removeItemFromTier },
  } = useTierListContext();

  const { availableProviders, status } = useRegistry();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      onDragEnter: ({ source }) => {
        const data = source.data;
        if (data.type === 'item' && data.tierId) {
          setIsDraggedOver(true);
        }
      },
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        setIsDraggedOver(false);
        const data = source.data;
        if (isDragItemData(data) && data.tierId) {
          removeItemFromTier(data.tierId, data.item.id);
        }
      },
    });
  }, [removeItemFromTier]);

  // 3. Provider selection
  const [providerId, setProviderId] = usePersistentState<string>(
    `moat-v2-search-provider`,
    availableProviders[0]?.id ?? '',
  );

  const selectedProvider = useMemo(() => {
    return availableProviders.find((p) => p.id === providerId) || availableProviders[0];
  }, [availableProviders, providerId]);

  // 4. Entity selection (Tabs)
  const [activeEntityId, setActiveEntityId] = usePersistentState<string>(
    `moat-v2-search-entity-${providerId}`,
    selectedProvider?.entities[0]?.id ?? '',
  );

  const [showAdded, setShowAdded] = usePersistentState<boolean>('moat-search-show-added', true);

  // Ensure selection is valid
  React.useEffect(() => {
    if (selectedProvider && !selectedProvider.entities.some((e) => e.id === activeEntityId)) {
      setActiveEntityId(selectedProvider.entities[0]?.id || '');
    }
  }, [selectedProvider, activeEntityId, setActiveEntityId]);

  if (availableProviders.length === 0) {
    if (status === RegistryStatus.INITIALIZING || status === RegistryStatus.IDLE) {
      return (
        <div className="border-border bg-surface text-secondary shadow-floating sticky top-4 flex h-64 flex-col items-center justify-center gap-3 rounded-lg border p-6">
          <Loader2 className="text-muted animate-spin" size={24} />
          <span className="text-sm font-medium">Booting providers...</span>
        </div>
      );
    }

    return (
      <div className="border-border bg-surface text-secondary shadow-floating sticky top-4 flex h-64 flex-col items-center justify-center rounded-lg border p-6 italic">
        No providers available.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="search-panel"
      className={`border-border bg-surface shadow-floating sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col rounded-lg border p-6 transition-colors sm:max-h-[calc(100dvh-2rem)] ${isDraggedOver ? 'border-red-500/50 bg-red-950/10' : ''}`}
    >
      {isDraggedOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg border-2 border-red-500/50 bg-red-950/60 backdrop-blur-[1px]">
          <Trash2 size={40} className="animate-bounce text-red-400" />
          <span className="mt-2 text-sm font-black tracking-wider text-red-200 uppercase">
            Drop to Delete
          </span>
        </div>
      )}
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-4 text-white">
        <div className="flex items-center gap-2">
          <Search size={20} />
          <h2 className="text-xl font-bold">Search</h2>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAdded(!showAdded)}
            className={`text-caption flex items-center gap-2 rounded-md border px-2 py-1 font-medium transition-colors ${showAdded ? 'border-border bg-surface-hover text-secondary hover:bg-surface' : 'border-primary/40 bg-primary/10 text-primary'}`}
            title={
              showAdded ? 'Hide items already on the board' : 'Show items already on the board'
            }
          >
            {showAdded ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>{showAdded ? 'Hide Added' : 'Show Added'}</span>
          </button>
        </div>
      </div>

      {/* Provider Toggle (Provider selection) */}
      {availableProviders.length > 1 && (
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <span className="text-caption text-secondary font-medium">Provider:</span>
          <div className="border-border flex items-center gap-1 rounded-lg border bg-black p-0.5">
            {availableProviders.map((p) => (
              <button
                key={p.id}
                onClick={() => setProviderId(p.id)}
                className={`text-caption rounded-md px-2.5 py-1 font-bold uppercase transition-all ${
                  providerId === p.id
                    ? 'bg-surface-hover text-foreground shadow-sm'
                    : 'text-secondary hover:text-muted'
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
        <div className="border-border mb-4 flex shrink-0 gap-1 rounded-lg border bg-black p-1">
          {selectedProvider.entities.map((entity) => {
            const { branding } = entity;
            const Icon = branding.icon;
            const isActive = activeEntityId === entity.id;

            return (
              <button
                key={entity.id}
                data-testid={`tab-${entity.id}`}
                onClick={() => setActiveEntityId(entity.id)}
                title={`Search ${branding.labelPlural}`}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${isActive ? 'bg-surface-hover text-foreground shadow-sm' : 'text-secondary hover:text-muted'} `}
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
