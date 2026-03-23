/**
 * @file DetailsModal.tsx
 * @description A modal component for displaying detailed information about a item.
 */

'use client';

import { Info, LucideIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useEscapeKey } from '@/core/ui/useEscapeKey';
import { getSubtitleString, Item, ItemSection, ItemUpdate } from '@/domain/items/items';
import { useItemResolver } from '@/features/items/useItemResolver';
import { registry } from '@/infra/providers/registry';

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
  /** Optional callback to navigate to a related item. */
  onNavigate?: (item: Item) => void;
  /** Whether the item is already added to the board. */
  isAdded?: boolean;
  /** Callback to add the item to the board. */
  onAddToTierlist?: (item: Item) => void;
}

/**
 * A comprehensive details view for native Items.
 * @param props - The component properties.
 * @param props.item - The item to display details for.
 * @param props.isOpen - Whether the modal is currently open.
 * @param props.onClose - Callback to close the modal.
 * @param props.onUpdateItem - Callback to persist updates to the item.
 * @param props.onNavigate - Optional callback to navigate to a related item.
 * @param props.isAdded - Whether the item is already added to the board.
 * @param props.onAddToTierlist - Callback to add the item to the board.
 * @returns The rendered DetailsModal component.
 */
export function DetailsModal({
  item,
  isOpen,
  onClose,
  onUpdateItem,
  onNavigate,
  isAdded = false,
  onAddToTierlist,
}: DetailsModalProps) {
  useEscapeKey(onClose, isOpen);

  const { resolvedItem, isLoading, error } = useItemResolver(isOpen ? item : null, {
    enabled: isOpen,
    onUpdate: onUpdateItem,
    persist: true,
  });

  useEffect(() => {
    if (error) {
      console.error('Failed to load item details:', error);
    }
  }, [error]);

  if (!isOpen || !resolvedItem) return null;

  const entityDef = registry.getEntity(
    resolvedItem.identity.providerId,
    resolvedItem.identity.entityId,
  );
  const PlaceholderIcon = (entityDef.branding.icon as LucideIcon) || Info;
  const colorClass = entityDef.branding.colorClass || 'text-primary';

  const details = resolvedItem.details;

  const renderSubtitle = () => {
    if (Array.isArray(resolvedItem.subtitle) && resolvedItem.subtitle.length > 0) {
      return (
        <div className="flex items-center gap-1">
          {resolvedItem.subtitle.map((token, idx) => (
            <div key={idx} className="flex items-center">
              {idx > 0 && <span className="text-muted mr-1">•</span>}
              {typeof token === 'string' ? (
                <span className="text-secondary font-medium">{token}</span>
              ) : (
                <button
                  onClick={() => {
                    onNavigate?.({
                      id: `${token.identity.providerId}:${token.identity.entityId}:${token.identity.providerItemId}`,
                      title: token.name,
                      identity: token.identity,
                      images: [],
                    });
                  }}
                  className="text-secondary text-left font-medium transition-colors hover:text-white hover:underline"
                >
                  {token.name}
                </button>
              )}
            </div>
          ))}
        </div>
      );
    }
    if (resolvedItem.subtitle) {
      return <span className="font-medium">{getSubtitleString(resolvedItem.subtitle)}</span>;
    }
    return null;
  };

  return (
    <div
      className="animate-in fade-in duration-fast fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative w-full max-w-4xl">
        <div
          className={`absolute -inset-24 ${colorClass} pointer-events-none z-0 rounded-full bg-current opacity-10 blur-[120px]`}
        />
        <div
          role="dialog"
          aria-modal="true"
          className="animate-in zoom-in-95 border-border shadow-floating duration-fast relative z-10 grid h-[85vh] max-h-[90vh] w-full grid-cols-1 overflow-hidden rounded-xl border bg-neutral-950 md:grid-cols-[280px_1fr]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Sidebar Pane */}
          <div className="border-border/40 custom-scrollbar flex flex-col gap-6 overflow-y-auto border-r bg-black/20 p-6">
            <div className="bg-surface-hover relative aspect-square w-full shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <ItemImage
                item={resolvedItem}
                TypeIcon={PlaceholderIcon}
                priority
                containerClassName="absolute inset-0"
                imageClassName="object-cover"
              />
            </div>

            <div className="space-y-4">
              {isLoading && (
                <div className="animate-pulse space-y-2 rounded-xl bg-white/[0.03] p-4">
                  <div className="h-3 w-1/2 rounded bg-white/10"></div>
                  <div className="h-3 w-3/4 rounded bg-white/10"></div>
                </div>
              )}
              {details?.extendedData && Object.keys(details.extendedData).length > 0 && (
                <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <h3 className="text-secondary text-xs font-semibold tracking-wider uppercase">
                    Details
                  </h3>
                  <div className="grid grid-cols-[85px_1fr] gap-x-3 gap-y-1.5 text-xs">
                    {Object.entries(details.extendedData).map(([key, value]) => (
                      <div
                        key={key}
                        className="col-span-2 grid grid-cols-subgrid items-baseline border-b border-white/[0.02] py-0.5 last:border-0"
                      >
                        <span className="text-secondary/80 font-medium tracking-tight">
                          {key.replaceAll(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-right font-semibold break-all text-white/90">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {details?.tags && details?.tags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-secondary text-xs font-semibold tracking-wider uppercase">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set(details?.tags || [])].map((tag) => (
                      <span
                        key={tag}
                        className="border-border text-secondary/90 rounded-md border bg-white/[0.03] px-2 py-0.5 text-[11px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {details?.urls && details.urls.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-secondary text-xs font-semibold tracking-wider uppercase">
                    Links
                  </h3>
                  <ExternalLinks urls={details.urls} />
                </div>
              )}

              {/* Notes Section in Sidebar */}
              <div className="mt-4 space-y-2">
                <h3 className="text-secondary text-xs font-semibold tracking-wider uppercase">
                  Notes
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

          {/* Right Main Pane */}
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-neutral-900/40">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:bg-black/80 hover:text-white"
            >
              <X size={20} />
            </button>

            {/* Header Title Space */}
            <div className="border-border/40 flex shrink-0 items-end justify-between border-b bg-gradient-to-b from-white/[0.02] to-transparent p-8 pb-6">
              <div className="min-w-0 flex-1 pt-6 pr-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-4xl">
                  {resolvedItem.title}
                </h1>
                {((resolvedItem.subtitle && resolvedItem.subtitle.length > 0) ||
                  resolvedItem.tertiaryText) && (
                  <div className="text-secondary mt-1 flex items-center gap-2 text-sm">
                    <PlaceholderIcon size={16} className={colorClass} />
                    {renderSubtitle()}
                    {resolvedItem.tertiaryText && (
                      <>
                        <span className="text-muted">•</span>
                        <span className="text-secondary">{resolvedItem.tertiaryText}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-6">
                {!isAdded && onAddToTierlist && (
                  <button
                    onClick={() => onAddToTierlist(resolvedItem)}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black shadow-lg transition-all hover:scale-105 hover:bg-neutral-200 active:scale-95"
                  >
                    <span>Add to Tierlist</span>
                  </button>
                )}
              </div>
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
                  <p className="font-semibold">Failed to load additional details.</p>
                  {error instanceof Error && (
                    <p className="mt-1 text-sm opacity-80">{error.message}</p>
                  )}
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

                    {details.relatedEntities && details.relatedEntities.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-secondary text-sm font-semibold tracking-wider uppercase">
                          Related
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {details.relatedEntities.map((entity, idx) => {
                            const provider = registry.getProvider(entity.identity.providerId);
                            const entityMeta = provider?.entities.find(
                              (e) => e.id === entity.identity.entityId,
                            );
                            const Icon = entityMeta?.branding.icon;
                            const colorClass = entityMeta?.branding.colorClass || 'text-white/60';

                            return (
                              <div key={idx} className="flex flex-col">
                                <span className="text-caption text-secondary font-bold tracking-tight uppercase">
                                  {entity.label}
                                </span>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  {Icon && (
                                    <Icon className={`h-3.5 w-3.5 ${colorClass} shrink-0`} />
                                  )}
                                  <span className="text-foreground text-sm font-medium">
                                    {entity.name}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
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
                            <p className="leading-relaxed">{section.content}</p>
                          )}
                          {section.type === 'list' && (
                            <div className="grid grid-cols-1 gap-1">
                              {section.content.map((li, i) => {
                                const label = typeof li === 'string' ? li : li.name;
                                const lastParen = label.lastIndexOf('(');
                                const duration =
                                  lastParen !== -1 && label.endsWith(')')
                                    ? label.slice(lastParen + 1, -1)
                                    : null;
                                const cleanLabel = duration
                                  ? label.slice(0, lastParen).trim()
                                  : label;

                                const match = /^(\d+)\.\s+/.exec(cleanLabel);
                                const trackNumber = match ? match[1] : null;
                                const trackTitle = match
                                  ? cleanLabel.slice(match[0].length)
                                  : cleanLabel;

                                const liEntity = typeof li === 'string' ? null : li;
                                const liProvider = liEntity
                                  ? registry.getProvider(liEntity.identity.providerId)
                                  : null;
                                const liMeta = liProvider?.entities.find(
                                  (e) => e.id === liEntity?.identity.entityId,
                                );
                                const LiIcon = liMeta?.branding.icon;
                                const liColorClass = liMeta?.branding.colorClass || 'text-white/80';

                                const contentNode = (
                                  <div className="z-10 flex w-full items-center justify-between gap-4 pl-2">
                                    <div className="flex items-center gap-3">
                                      {trackNumber && (
                                        <span className="text-secondary/40 w-5 shrink-0 text-right font-mono text-xs">
                                          {trackNumber}
                                        </span>
                                      )}
                                      {LiIcon && (
                                        <LiIcon
                                          className={`h-3.5 w-3.5 ${liColorClass} shrink-0`}
                                        />
                                      )}
                                      <span className="truncate font-semibold text-white/90 transition-all duration-200 group-hover/item:translate-x-1 group-hover/item:text-white">
                                        {trackTitle}
                                      </span>
                                    </div>
                                    {duration && (
                                      <span className="text-muted group-hover/item:text-secondary shrink-0 font-mono text-xs">
                                        {duration}
                                      </span>
                                    )}
                                  </div>
                                );

                                return (
                                  <div
                                    key={i}
                                    className="group/item relative flex items-center overflow-hidden rounded-xl border border-white/5 bg-white/[0.01] px-4 py-2 text-sm shadow-sm transition-all hover:bg-white/[0.04]"
                                  >
                                    {typeof li === 'string' ? (
                                      <div className="text-secondary w-full">{contentNode}</div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          onNavigate?.({
                                            id: `${li.identity.providerId}:${li.identity.entityId}:${li.identity.providerItemId}`,
                                            title: li.name,
                                            identity: li.identity,
                                            images: [],
                                          });
                                        }}
                                        className="text-secondary w-full text-left transition-colors hover:text-white"
                                      >
                                        {contentNode}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* External Links Moved to Sidebar */}
                </>
              )}
            </div>
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
      placeholder="Write your thoughts about this item..."
      className="custom-scrollbar min-h-[100px] w-full resize-none rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs text-white/80 transition-all duration-200 placeholder:text-white/20 focus:min-h-[220px] focus:border-white/10 focus:outline-none"
    />
  );
}
