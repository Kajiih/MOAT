/**
 * @file DetailsModal.tsx
 * @description A modal component for displaying detailed information about a media item.
 * It fetches deep metadata (tracklists, artist bios, etc.) on demand and displays it in a rich layout.
 * Also handles image error fallbacks and retries.
 * @module DetailsModal
 */

'use client';

import { X } from 'lucide-react';

import { useEscapeKey,useMediaResolver } from '@/lib/hooks';
import { mediaTypeRegistry } from '@/lib/media-types';
import { MediaItem } from '@/lib/types';

import { AlbumView } from './details/AlbumView';
import { ArtistView } from './details/ArtistView';
import { SongView } from './details/SongView';
import { MediaImage } from './MediaImage';

/**
 * Props for the DetailsModal component.
 */
interface DetailsModalProps {
  /** The media item to display details for, or null if closed. */
  item: MediaItem | null;
  /** Whether the modal is currently visible. */
  isOpen: boolean;
  /** Callback fired when the modal should be closed. */
  onClose: () => void;
  /** Optional callback to persist enriched metadata back to the parent state. */
  onUpdateItem?: (itemId: string, updates: Partial<MediaItem>) => void;
}

/**
 * Renders a modal displaying deep metadata and rich information for a selected media item.
 * Automatically fetches missing details on mount if they aren't provided in the item.
 * @param props - The props for the component.
 * @param props.item - The media item to display details for, or null if closed.
 * @param props.isOpen - Whether the modal is currently visible.
 * @param props.onClose - Callback fired when the modal should be closed.
 * @param [props.onUpdateItem] - Optional callback to persist enriched metadata back to the parent state.
 * @returns The rendered DetailsModal component, or null if it's not open.
 */
export function DetailsModal({ item, isOpen, onClose, onUpdateItem }: DetailsModalProps) {
  useEscapeKey(onClose, isOpen);

  // Use the unified Media Resolver to handle fetching and syncing
  const { resolvedItem, isLoading, error } = useMediaResolver(item, {
    enabled: isOpen,
    onUpdate: onUpdateItem,
    persist: true,
  });

  const details = resolvedItem?.details;

  if (!isOpen || !resolvedItem) return null;

  const definition = mediaTypeRegistry.get(resolvedItem.type);
  const PlaceholderIcon = definition.icon;

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200"
      onClick={onClose}
    >
      <div
        className="animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Cover Art */}
        <div className="relative h-48 shrink-0 overflow-hidden bg-neutral-950 sm:h-64">
          <MediaImage
            item={resolvedItem}
            priority
            TypeIcon={PlaceholderIcon}
            containerClassName="absolute inset-0"
            imageClassName="object-cover opacity-60 blur-sm"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/50 to-transparent" />

          <div className="absolute bottom-0 left-0 flex w-full items-end gap-4 p-6 text-left">
            <MediaImage
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
                <definition.icon size={16} className={definition.colorClass} />
                <span className="font-medium">
                  {('artist' in resolvedItem && resolvedItem.artist) ||
                    ('author' in resolvedItem && resolvedItem.author) ||
                    'Artist'}
                </span>
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

        {/* Content */}
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          {/* Loading State */}
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

          {/* Error State */}
          {error && (
            <div className="rounded border border-red-900/20 bg-red-900/10 p-4 text-center text-red-400">
              Failed to load additional details.
            </div>
          )}

          {/* Data Display */}
          {details && !isLoading && (
            <>
              {details.type === 'album' && <AlbumView details={details} />}
              {details.type === 'artist' && <ArtistView details={details} />}
              {details.type === 'song' && <SongView details={details} />}
              {details.type === 'book' && (
                <div className="space-y-6">
                  {details.firstSentence && (
                    <div className="relative rounded-lg border border-neutral-800 bg-neutral-950/50 p-4 italic">
                      <div className="mb-2 text-[9px] font-bold tracking-widest text-neutral-500 uppercase">
                        First Sentence
                      </div>
                      <p className="text-sm leading-relaxed text-neutral-300">
                        &ldquo;{details.firstSentence}&rdquo;
                      </p>
                    </div>
                  )}

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

                  {details.places && details.places.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
                        Setting / Places
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {details.places.map((place: string) => (
                          <span
                            key={place}
                            className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800/50 px-3 py-1 text-xs text-neutral-300"
                          >
                            <span className="text-[10px]">📍</span> {place}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {details.tags && details.tags.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
                        Subjects
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {details.tags.map((tag: string) => (
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
                  {details.urls && details.urls.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
                        Links
                      </h3>
                      <div className="flex flex-col gap-1">
                        {details.urls.map((link: { type: string; url: string }) => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            {link.type || 'More Info'}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
