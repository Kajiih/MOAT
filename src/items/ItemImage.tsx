/**
 * @file ItemImage.tsx
 * @description The standard image component for all items.
 * Handles the prioritized resolution of multiple image sources (URLs, healing references).
 */

'use client';

import { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { failedImages } from '@/items/image-cache';
import { Item } from '@/items/items';
import { useResolvedImage } from '@/items/useResolvedImage';

/**
 * Props for the ItemImage component.
 */
export interface ItemImageProps {
  /** The item whose image is being displayed. */
  item: Item;
  /** Placeholder icon to show if no image is found or loading fails. */
  TypeIcon: LucideIcon;
  /** Whether the component is being rendered for image export. */
  isExport?: boolean;
  /** A pre-resolved URL for instant rendering in exports. */
  resolvedUrl?: string;
  /** Whether the image should be loaded with priority. */
  priority?: boolean;
  /** CSS class for the container. */
  containerClassName?: string;
  /** CSS class for the image element. */
  imageClassName?: string;
  /** Sizes hint for responsive image loading. */
  sizes?: string;
}

/**
 * A highly robust image component that resolves sources via a waterfall strategy.
 * @param props - The component props.
 * @param props.item - The item to render.
 * @param props.TypeIcon - Placeholder icon.
 * @param props.isExport - Whether in export mode.
 * @param props.resolvedUrl - Pre-resolved URL for exports.
 * @param props.priority - Next.js image priority.
 * @param props.containerClassName - Container class.
 * @param props.imageClassName - Image tag class.
 * @param props.sizes - Image sizes attribute.
 * @returns The rendered ItemImage component.
 */
export function ItemImage({
  item,
  TypeIcon,
  isExport = false,
  resolvedUrl: exportUrl,
  priority = false,
  containerClassName = 'absolute inset-0',
  imageClassName = 'object-cover',
  sizes = '112px',
}: ItemImageProps) {
  const resolvedUrl = useResolvedImage(item.images);
  const displayUrl = isExport ? exportUrl : resolvedUrl;

  const [imageError, setImageError] = useState(false);
  const [retryUnoptimized, setRetryUnoptimized] = useState(false);

  // Export mode with pre-resolved URL
  if (isExport === true && displayUrl) {
    return (
      <div className={containerClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayUrl}
          alt={item.title}
          className={`h-full w-full ${imageClassName}`}
          decoding="sync"
        />
      </div>
    );
  }

  // Local Image mode
  if (displayUrl && !imageError) {
    return (
      <div className={containerClassName}>
        <Image
          src={displayUrl}
          alt={item.title}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={retryUnoptimized}
          className={`${imageClassName} pointer-events-none transition-opacity duration-300`}
          onError={() => {
            if (!retryUnoptimized) {
              setRetryUnoptimized(true);
            } else {
              failedImages.add(displayUrl);
              setImageError(true);
            }
          }}
        />
      </div>
    );
  }

  // Placeholder mode
  return (
    <div
      className={`${containerClassName} flex flex-col items-center justify-center overflow-hidden border border-border bg-surface p-2 text-neutral-600`}
    >
      <TypeIcon size={24} className="mb-1 opacity-50" />
      {isExport && (
        <span className="mt-1 line-clamp-2 px-1 text-center text-caption leading-tight font-black uppercase opacity-30">
          {item.title}
        </span>
      )}
      <span className="mt-1 text-center text-indicator leading-tight font-bold uppercase opacity-20">
        {item.identity.entityId}
      </span>
    </div>
  );
}
