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

  const entityDef = registry.getEntity(
    resolvedItem.identity.databaseId,
    resolvedItem.identity.entityId,
  );
  const PlaceholderIcon = (entityDef.branding.icon as LucideIcon) || Info;
  const colorClass = entityDef.branding.colorClass || 'text-primary';

  const subtitle = resolvedItem.subtitle || '';

  const details = resolvedItem.details;

  return (
    <div
      className="animate-in fade-in duration-fast fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="animate-in zoom-in-95 border-border bg-surface shadow-floating duration-fast flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Cover Art */}
        <div className="bg-surface relative h-48 shrink-0 overflow-hidden sm:h-64">
          <ItemImage
            item={resolvedItem}
            TypeIcon={PlaceholderIcon}
            priority
            containerClassName="absolute inset-0"
            imageClassName="object-cover opacity-60 blur-sm"
            sizes="300px"
          />
          <div className="from-background via-background/50 absolute inset-0 bg-gradient-to-t to-transparent" />

          <div className="absolute bottom-0 left-0 flex w-full items-end gap-4 p-6 text-left">
            <ItemImage
              item={resolvedItem}
              TypeIcon={PlaceholderIcon}
              containerClassName="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-white/10 bg-surface-hover shadow-card sm:h-24 sm:w-24"
              sizes="96px"
            />
            <div className="min-w-0 flex-1 pt-2">
              <h2 className="truncate text-2xl font-bold text-white drop-shadow-sm sm:text-3xl">
                {resolvedItem.title}
              </h2>
              <div className="text-secondary mt-1 flex items-center gap-2">
                <PlaceholderIcon size={16} className={colorClass} />
                <span className="font-medium">{subtitle}</span>
                {resolvedItem.tertiaryText && (
                  <>
                    <span className="text-muted">•</span>
                    <span className="text-secondary">{resolvedItem.tertiaryText}</span>
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
              <div className="bg-surface-hover h-4 w-1/3 rounded-md"></div>
              <div className="space-y-2">
                <div className="bg-surface-hover h-10 w-full rounded-md"></div>
                <div className="bg-surface-hover h-10 w-full rounded-md"></div>
                <div className="bg-surface-hover h-10 w-full rounded-md"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="border-destructive/20 text-destructive rounded-md border bg-red-900/10 p-4 text-center">
              Failed to load additional details.
            </div>
          )}

          {details && !isLoading && (
            <>
              <div className="space-y-6">
                {details.description && (
                  <div className="space-y-2">
                    <h3 className="text-secondary text-sm font-semibold tracking-wider uppercase">
                      Description
                    </h3>
                    <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                      {details.description}
                    </p>
                  </div>
                )}

                {details.tags && details.tags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-secondary text-sm font-semibold tracking-wider uppercase">
                      Subjects / Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {[...new Set(details.tags)].map((tag: string) => (
                        <span
                          key={tag}
                          className="border-border bg-surface-hover text-secondary rounded-md border px-2 py-1 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {details.relatedEntities && details.relatedEntities.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-secondary text-sm font-semibold tracking-wider uppercase">
                      Related
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {details.relatedEntities.map((entity, idx) => (
                        <div key={idx} className="flex flex-col">
                          <span className="text-caption text-secondary font-bold tracking-tight uppercase">
                            {entity.label}
                          </span>
                          <span className="text-foreground text-sm">{entity.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {details.extendedData && Object.keys(details.extendedData).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-secondary text-sm font-semibold tracking-wider uppercase">
                      Additional Info
                    </h3>
                    <div className="bg-background border-border grid grid-cols-2 gap-4 rounded-lg border p-4">
                      {Object.entries(details.extendedData).map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <span className="text-caption text-secondary font-bold tracking-tight uppercase">
                            {key.replaceAll(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-foreground text-sm">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {details.sections?.map((section: ItemSection, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <h3 className="text-secondary text-sm font-semibold tracking-wider uppercase">
                      {section.title}
                    </h3>
                    <div className="text-secondary text-sm">
                      {section.type === 'text' && (
                        <p className="leading-relaxed">{section.content as string}</p>
                      )}
                      {section.type === 'list' && (
                        <ul className="list-inside list-disc space-y-1">
                          {(section.content as string[]).map((li, i) => (
                            <li key={i}>{li}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {details.urls && details.urls.length > 0 && <ExternalLinks urls={details.urls} />}
            </>
          )}

          <div className="border-border mt-8 border-t pt-6">
            <h3 className="text-secondary mb-3 text-sm font-semibold tracking-wider uppercase">
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
      className="border-border bg-surface text-secondary placeholder:text-muted focus:border-border focus:ring-primary min-h-[120px] w-full rounded-lg border p-4 text-sm leading-relaxed transition-colors focus:ring-2 focus:outline-none"
    />
  );
}
