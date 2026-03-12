/**
 * @file DetailsModal.tsx
 * @description A modal component for displaying detailed information about a item.
 */

'use client';

import { Info, LucideIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Item, ItemSection, ItemUpdate } from '@/items/items';
import { useItemResolver } from '@/items/useItemResolver';
import { useEscapeKey } from '@/lib/ui/useEscapeKey';
import { registry } from '@/providers/registry';

import { ExternalLinks } from './ExternalLinks';
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
  onUpdateItem?: (itemId: string, updates: ItemUpdate) => void;
}

/**
 * A comprehensive details view for native Items.
 * @param props - The component properties.
 * @param props.item - The item to display details for.
 * @param props.isOpen - Whether the modal is currently open.
 * @param props.onClose - Callback to close the modal.
 * @param props.onUpdateItem - Callback to persist updates to the item.
 * @returns The rendered DetailsModal component.
 */
export function DetailsModal({ item, isOpen, onClose, onUpdateItem }: DetailsModalProps) {
  useEscapeKey(onClose, isOpen);

  const { resolvedItem, isLoading, error } = useItemResolver(isOpen ? item : null, {
    enabled: isOpen,
    onUpdate: onUpdateItem,
    persist: true,
  });

  if (!isOpen || !resolvedItem) return null;

  const entityDef = registry.getEntity(resolvedItem.identity.databaseId, resolvedItem.identity.entityId);
  const PlaceholderIcon = (entityDef.branding.icon as LucideIcon) || Info;
  const colorClass = entityDef.branding.colorClass || 'text-blue-400';
  
  const subtitle = resolvedItem.subtitle || '';

  const details = resolvedItem.details;

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
          <ItemImage
            item={resolvedItem}
            TypeIcon={PlaceholderIcon}
            priority
            containerClassName="absolute inset-0"
            imageClassName="object-cover opacity-60 blur-sm"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/50 to-transparent" />

          <div className="absolute bottom-0 left-0 flex w-full items-end gap-4 p-6 text-left">
            <ItemImage
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
                {resolvedItem.tertiaryText && (
                  <>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-400">{resolvedItem.tertiaryText}</span>
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

                {details.relatedEntities && details.relatedEntities.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
                      Related
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {details.relatedEntities.map((entity, idx) => (
                        <div key={idx} className="flex flex-col">
                          <span className="text-tiny font-bold tracking-tight text-neutral-500 uppercase">
                            {entity.label}
                          </span>
                          <span className="text-sm text-neutral-200">
                            {entity.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {details.extendedData && Object.keys(details.extendedData).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
                      Additional Info
                    </h3>
                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-neutral-950/50 p-4 border border-neutral-800/50">
                      {Object.entries(details.extendedData).map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <span className="text-tiny font-bold tracking-tight text-neutral-500 uppercase">
                            {key.replaceAll(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-sm text-neutral-200">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {details.sections?.map((section: ItemSection, idx: number) => (
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
              key={resolvedItem.id}
              initialNotes={resolvedItem.notes || ''}
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
 * @param props - Configuration properties.
 * @param props.itemId - Target entity ID.
 * @param props.initialNotes - The cached initial notes block.
 * @param props.onUpdate - Callback emitted when a save completes.
 * @returns The decoupled notes state and save handlers.
 */
function LocalNotesEditor({
  initialNotes,
  itemId,
  onUpdate,
}: {
  initialNotes: string;
  itemId: string;
  onUpdate?: (id: string, updates: ItemUpdate) => void;
}) {
  // --- Idiomatic React Pattern: Render-Phase State Derivation ---
  // We use this pattern for Controlled Draft Inputs (Inputs that buffer local keystrokes 
  // to avoid spamming Redux, but must also respect external Redux rollbacks like Undo).
  const [notes, setNotes] = useState(initialNotes);
  const [prevInitialNotes, setPrevInitialNotes] = useState(initialNotes);
  const notesRef = useRef(notes);
  const onUpdateRef = useRef(onUpdate);
  const [lastPushedNotes, setLastPushedNotes] = useState(initialNotes);

  if (initialNotes !== prevInitialNotes) {
    setPrevInitialNotes(initialNotes);
    
    // Only overwrite the user's active typing if the incoming external state change 
    // is DIFFERENT from the last string we successfully dispatched to Redux. 
    // This perfectly differentiates genuine Undo rollbacks from delayed Redux "echoes".
    if (initialNotes !== lastPushedNotes) {
      setNotes(initialNotes);
    }
  }

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (notes === initialNotes) return;
    const timeoutId = setTimeout(() => {
      setLastPushedNotes(notes);
      onUpdateRef.current?.(itemId, { notes });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [notes, itemId, initialNotes]);

  useEffect(() => {
    return function flushNotesOnUnmount() {
      if (notesRef.current !== initialNotes) {
        setLastPushedNotes(notesRef.current);
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
