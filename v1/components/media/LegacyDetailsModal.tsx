/**
 * @file LegacyDetailsModal.tsx
 * @description [LEGACY V1] A modal component for displaying detailed information about a legacy media item.
 */

'use client';

import { Info, LucideIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useLegacyItemResolver } from '@/v1/lib/hooks/useLegacyItemResolver';
import { LegacyItem } from '@/v1/lib/types';
import { useEscapeKey } from '@/lib/hooks';
import { LegacyItemImage } from '@/v1/components/media/LegacyItemImage';
import { itemTypeRegistry } from '@/v1/lib/item-types';

import { AlbumView } from '@/components/media/details/AlbumView';
import { ArtistView } from '@/components/media/details/ArtistView';
import { ExternalLinks } from '@/components/media/details/ExternalLinks';
import { GameView } from '@/components/media/details/GameView';
import { SongView } from '@/components/media/details/SongView';

interface LegacyDetailsModalProps {
  item: LegacyItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem?: (itemId: string, updates: Partial<LegacyItem>) => void;
}

export function LegacyDetailsModal({ item, isOpen, onClose, onUpdateItem }: LegacyDetailsModalProps) {
  useEscapeKey(onClose, isOpen);

  const { resolvedItem, isLoading, error } = useLegacyItemResolver(isOpen ? item : null, {
    enabled: isOpen,
    onUpdate: onUpdateItem,
    persist: true,
  });

  if (!isOpen || !resolvedItem) return null;

  const definition = itemTypeRegistry.get(resolvedItem.type);
  const PlaceholderIcon = definition.icon;
  const colorClass = definition.colorClass;
  const subtitle = (('artist' in resolvedItem && resolvedItem.artist) || ('author' in resolvedItem && resolvedItem.author) || '') as string;

  const details = resolvedItem.details as any;

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
        <div className="relative h-48 shrink-0 overflow-hidden bg-neutral-950 sm:h-64">
          <LegacyItemImage
            item={resolvedItem}
            priority
            TypeIcon={PlaceholderIcon}
            containerClassName="absolute inset-0"
            imageClassName="object-cover opacity-60 blur-sm"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/50 to-transparent" />

          <div className="absolute bottom-0 left-0 flex w-full items-end gap-4 p-6 text-left">
            <LegacyItemImage
              item={resolvedItem}
              TypeIcon={PlaceholderIcon}
              containerClassName="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-white/10 bg-neutral-800 shadow-lg sm:h-24 sm:w-24"
              sizes="96px"
            />
            <div className="min-w-0 flex-1 pt-2">
              <h2 className="truncate text-2xl font-bold text-white drop-shadow-sm sm:text-3xl">
                {resolvedItem.title}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-neutral-300">
                <PlaceholderIcon size={16} className={colorClass} />
                <span className="font-medium">{subtitle}</span>
                {resolvedItem.year && (
                  <>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-400">{resolvedItem.year}</span>
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
              {details.type === 'album' && <AlbumView details={details} />}
              {details.type === 'artist' && <ArtistView details={details} />}
              {details.type === 'song' && <SongView details={details} />}
              {details.type === 'game' && <GameView details={details} />}
              
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
                      {[...new Set(details.tags)].map((tag: any) => (
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
              </div>

              {details.urls && details.urls.length > 0 && (
                <ExternalLinks urls={details.urls} />
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
