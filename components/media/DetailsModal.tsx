/**
 * @file DetailsModal.tsx
 * @description A modal component for displaying detailed information about a media item.
 * Supports both V1 LegacyItem (Legacy) and V2 Item (Standard).
 */

'use client';

import { Info, LucideIcon,X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useItemResolver } from '@/lib/database/hooks/useItemResolver';
import { registry } from '@/lib/database/registry';
import { Item, ItemDetails, ItemSection } from '@/lib/database/types';
import { useEscapeKey, useItemResolver } from '@/lib/hooks';
import { LegacyItem } from '@/lib/types';
import { LegacyItemImage } from '@/v1/components/media/LegacyItemImage';
import { itemTypeRegistry } from '@/v1/lib/item-types';

import { AlbumView } from './details/AlbumView';
import { ArtistView } from './details/ArtistView';
import { ExternalLinks } from './details/ExternalLinks';
import { GameView } from './details/GameView';
import { SongView } from './details/SongView';
import { ItemImage } from './ItemImage';

/**
 * Props for the DetailsModal component.
 */
interface DetailsModalProps {
  /** The item to display details for, or null if closed. */
  item: Item | null;
  /** Whether the modal is currently visible. */
  isOpen: boolean;
  /** Callback fired when the modal should be closed. */
  onClose: () => void;
  /** Optional callback to persist enriched metadata back to the parent state. */
  onUpdateItem?: (itemId: string, updates: Partial<Item>) => void;
}

/**
 * A comprehensive details view that branches logic based on the item architecture (Legacy V1 or Standard V2).
 * @param props - The component props.
 * @param props.item
 * @param props.isOpen
 * @param props.onClose
 * @param props.onUpdateItem
 * @returns The rendered DetailsModal component.
 */
export function DetailsModal({ item, isOpen, onClose, onUpdateItem }: DetailsModalProps) {
  useEscapeKey(onClose, isOpen);

  const isV2 = !!item && 'identity' in item;

  // V1 Resolver (Legacy)
  const v1Result = useItemResolver((isOpen && !isV2) ? item as LegacyItem : null, {
    enabled: isOpen && !isV2,
    onUpdate: onUpdateItem as (id: string, updates: Partial<LegacyItem>) => void,
    persist: true,
  });

  // V2 Resolver (Standard)
  const v2Result = useItemResolver((isOpen && isV2) ? item as Item : null, {
    enabled: isOpen && isV2,
    onUpdate: onUpdateItem as (id: string, updates: Partial<Item>) => void,
    persist: true,
  });

  const resolvedItem = isV2 ? v2Result.resolvedItem : v1Result.resolvedItem;
  const isLoading = isV2 ? v2Result.isLoading : v1Result.isLoading;
  const error = isV2 ? v2Result.error : v1Result.error;

  if (!isOpen || !resolvedItem) return null;

  // Branding & Icons
  let PlaceholderIcon: LucideIcon = Info;
  let colorClass = 'text-blue-400';
  let subtitle = '';

  if (isV2) {
    const si = resolvedItem as Item;
    const entityDef = registry.getEntity(si.identity.databaseId, si.identity.entityId);
    PlaceholderIcon = (entityDef?.branding.icon as LucideIcon) || Info;
    colorClass = entityDef?.branding.colorClass || 'text-blue-400';
    subtitle = si.subtitle || '';
  } else {
    const mi = resolvedItem as LegacyItem;
    const definition = itemTypeRegistry.get(mi.type);
    PlaceholderIcon = definition.icon;
    colorClass = definition.colorClass;
    subtitle = (('artist' in mi && mi.artist) || ('author' in mi && mi.author) || '') as string;
  }

  const details = resolvedItem.details as (LegacyItem['details'] | ItemDetails);

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Cover Art */}
        <div className="relative h-48 shrink-0 overflow-hidden bg-neutral-950 sm:h-64">
          {isV2 ? (
            <ItemImage
              item={resolvedItem as Item}
              TypeIcon={PlaceholderIcon}
              priority
              containerClassName="absolute inset-0"
              imageClassName="object-cover opacity-60 blur-sm"
              sizes="100vw"
            />
          ) : (
            <LegacyItemImage
              item={resolvedItem as LegacyItem}
              priority
              TypeIcon={PlaceholderIcon}
              containerClassName="absolute inset-0"
              imageClassName="object-cover opacity-60 blur-sm"
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/50 to-transparent" />

          <div className="absolute bottom-0 left-0 flex w-full items-end gap-4 p-6 text-left">
            {isV2 ? (
              <ItemImage
                item={resolvedItem as Item}
                TypeIcon={PlaceholderIcon}
                containerClassName="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-white/10 bg-neutral-800 shadow-lg sm:h-24 sm:w-24"
                sizes="96px"
              />
            ) : (
              <LegacyItemImage
                item={resolvedItem as LegacyItem}
                TypeIcon={PlaceholderIcon}
                containerClassName="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-white/10 bg-neutral-800 shadow-lg sm:h-24 sm:w-24"
                sizes="96px"
              />
            )}
            <div className="min-w-0 flex-1 pt-2">
              <h2 className="truncate text-2xl font-bold text-white drop-shadow-sm sm:text-3xl">
                {resolvedItem.title}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-neutral-300">
                <PlaceholderIcon size={16} className={colorClass} />
                <span className="font-medium">{subtitle}</span>
                {!isV2 && (resolvedItem as LegacyItem).year && (
                  <>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-400">{(resolvedItem as LegacyItem).year}</span>
                  </>
                )}
                {isV2 && (resolvedItem as Item).tertiaryText && (
                  <>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-400">{(resolvedItem as Item).tertiaryText}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/80"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Section */}
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          {isLoading && (
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-1/3 rounded bg-neutral-800"></div>
              <div className="space-y-2">
                <div className="h-10 w-full rounded bg-neutral-800"></div>
                <div className="h-10 w-full rounded bg-neutral-800"></div>
                <div className="h-10 w-full rounded bg-neutral-800"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded border border-red-900/20 bg-red-900/10 p-4 text-center text-red-400">
              Failed to load additional details.
            </div>
          )}

          {details && !isLoading && (
            <>
              {!isV2 && (details as any).type === 'album' && <AlbumView details={details as any} />}
              {!isV2 && (details as any).type === 'artist' && <ArtistView details={details as any} />}
              {!isV2 && (details as any).type === 'song' && <SongView details={details as any} />}
              {!isV2 && (details as any).type === 'game' && <GameView details={details as any} />}
              
              <div className="space-y-6">
                {details.description && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
                      Description
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-300">
                      {details.description}
                    </p>
                  </div>
                )}

                {details.tags && details.tags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
                      Subjects / Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {[...new Set(details.tags)].map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {isV2 && (details as ItemDetails).sections?.map((section: ItemSection, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <h3 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
                      {section.title}
                    </h3>
                    <div className="text-sm text-neutral-300">
                      {section.type === 'text' && <p className="leading-relaxed">{section.content as string}</p>}
                      {section.type === 'list' && (
                        <ul className="list-disc list-inside space-y-1">
                          {(section.content as string[]).map((li, i) => (
                            <li key={i}>{li}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {(details as any).urls && (details as any).urls.length > 0 && (
                <ExternalLinks urls={(details as any).urls} />
              )}
            </>
          )}

          <div className="mt-8 border-t border-neutral-800 pt-6">
            <h3 className="mb-3 text-sm font-semibold tracking-wider text-neutral-400 uppercase">
              Personal Notes
            </h3>
            <LocalNotesEditor
              initialNotes={(resolvedItem as any).notes || ''}
              itemId={resolvedItem.id}
              onUpdate={onUpdateItem}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Internal component to handle notes editing.
 * @param root0
 * @param root0.initialNotes
 * @param root0.itemId
 * @param root0.onUpdate
 */
function LocalNotesEditor({
  initialNotes,
  itemId,
  onUpdate,
}: {
  initialNotes: string;
  itemId: string;
  onUpdate?: (id: string, updates: Partial<any>) => void;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [prevInitialNotes, setPrevInitialNotes] = useState(initialNotes);
  const notesRef = useRef(notes);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  if (initialNotes !== prevInitialNotes) {
    setPrevInitialNotes(initialNotes);
    setNotes(initialNotes);
  }

  useEffect(() => {
    if (notes === initialNotes) return;
    const timeoutId = setTimeout(() => {
      onUpdateRef.current?.(itemId, { notes });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [notes, itemId, initialNotes]);

  useEffect(() => {
    return function flushNotesOnUnmount() {
      if (notesRef.current !== initialNotes) {
        onUpdateRef.current?.(itemId, { notes: notesRef.current });
      }
    };
  }, [itemId, initialNotes]);

  return (
    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="Write your thoughts about this item... (e.g. why it's in this tier)"
      className="min-h-[120px] w-full rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-sm leading-relaxed text-neutral-300 transition-colors placeholder:text-neutral-700 focus:border-neutral-600 focus:ring-0 focus:outline-none"
    />
  );
}
