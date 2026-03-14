/**
 * @file Async Select Filter Input
 * @description A dynamic search-driven dropdown filter component that queries the active provider's entities.
 */

import { Loader2, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { ImageSource } from '@/items/images';
import { Item } from '@/items/items';
import { useResolvedImage } from '@/items/useResolvedImage';
import { registry } from '@/providers/registry';
import { AsyncSelectFilterDefinition } from '@/search/filter-schemas';
import { useItemSearch } from '@/search/useItemSearch';

import { FilterControlProps } from './types';

/**
 * Renders an asynchronous select input allowing users to search dynamically against another entity.
 * @param props - The standard filter control properties augmented with provider tracking.
 * @param props.providerId - The ID of the active data provider to query.
 * @param props.filter - The async selection definition details.
 * @param props.value - The currently selected entity ID or undefined.
 * @param props.onChange - Functional callback resolving the updated state.
 * @returns A fully bound async search-select popover.
 */
export function AsyncSelectFilterInput({
  providerId,
  filter,
  value,
  onChange,
}: FilterControlProps<AsyncSelectFilterDefinition>) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [resolvedEntity, setResolvedEntity] = useState<{ id: string; title: string; images: ImageSource[] } | null>(null);

  const targetEntityId = filter.targetEntityId;

  useEffect(() => {
    if (!value || typeof value !== 'string') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResolvedEntity(null);
      return;
    }

    if (resolvedEntity?.id === value) {
      return; 
    }

    if (providerId && targetEntityId) {
      registry
        .getEntity(providerId, targetEntityId)
        .getDetails(value)
        .then((res) => {
          setResolvedEntity({
            id: value,
            title: res.title || value,
            images: res.images || [],
          });
        })
        .catch(() => {
          setResolvedEntity({ id: value, title: value, images: [] });
        });
    }
  }, [value, providerId, targetEntityId, resolvedEntity?.id]);

  const searchParams = useMemo(
    () => ({
      query: debouncedQuery,
      filters: {},
      limit: 10,
    }),
    [debouncedQuery],
  );

  const { results, isLoading } = useItemSearch(providerId || '', targetEntityId, searchParams, {
    enabled: isOpen && !!providerId,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {value ? (
        <div className="border-border text-foreground focus-within:border-primary focus-within:ring-primary flex w-full items-center justify-between rounded-md border bg-black px-2 py-1.5 text-xs outline-none focus-within:ring-1">
          <div className="flex min-w-0 items-center gap-2 pr-2">
            {resolvedEntity ? (
              <SelectedEntityDisplay entity={resolvedEntity} />
            ) : (
              <span className="text-muted flex items-center gap-2 truncate">
                <Loader2 className="animate-spin" size={12} /> Resolving...
              </span>
            )}
          </div>
          <button
            onClick={() => {
              onChange();
              setQuery('');
            }}
            className="text-secondary hover:text-foreground shrink-0 p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <input
          type="text"
          placeholder={`Search ${filter.label}...`}
          className="border-border text-foreground focus:border-primary focus:ring-primary w-full rounded-md border bg-black px-2 py-1.5 text-xs outline-none focus:ring-1"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      )}

      {isOpen && !value && (
        <div className="border-border bg-surface absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border shadow-md">
          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="text-secondary animate-spin" size={16} />
            </div>
          )}
          {!isLoading && results.length === 0 && (
            <div className="text-muted p-2 text-center text-xs">No options found</div>
          )}
          {!isLoading &&
            results.map((item) => (
              <AsyncOption
                key={item.id}
                item={item as Item}
                onSelect={() => {
                  setResolvedEntity({ id: item.identity.dbId, title: item.title, images: item.images || [] });
                  onChange(item.identity.dbId);
                  setIsOpen(false);
                  setQuery('');
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function SelectedEntityDisplay({ entity }: { entity: { title: string; images: ImageSource[] } }) {
  const resolvedUrl = useResolvedImage(entity.images);
  return (
    <>
      {resolvedUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolvedUrl} alt="" className="h-4 w-4 rounded-sm object-cover shrink-0" />
      )}
      <span className="truncate">{entity.title}</span>
    </>
  );
}

function AsyncOption({ item, onSelect }: { item: Item; onSelect: () => void }) {
  const resolvedUrl = useResolvedImage(item.images || []);
  
  return (
    <button
      onClick={onSelect}
      className="hover:bg-surface-hover text-foreground flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors"
      title={item.title}
    >
      {resolvedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolvedUrl} alt="" className="border-border h-8 w-8 shrink-0 rounded-sm border object-cover" />
      ) : (
        <div className="bg-surface-hover border-border flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border"></div>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="font-medium truncate w-full">{item.title}</span>
        {item.subtitle && (
          <span className="text-muted truncate text-[10px] w-full">{item.subtitle}</span>
        )}
      </div>
    </button>
  );
}
