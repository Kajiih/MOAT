/**
 * @file MediaImage.tsx
 * @description Centralized component for rendering media images with unified error handling,
 * unoptimized retries, and placeholders.
 */

'use client';

import { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { failedImages } from '@/lib/image-cache';
import { MediaItem } from '@/lib/types';

interface MediaImageProps {
  item: MediaItem;
  /** Whether the component is being rendered for a screenshot export. */
  isExport?: boolean;
  /** A pre-resolved Data URL for the image (used in exports). */
  resolvedUrl?: string;
  /** Whether to prioritize loading the image (eager load). */
  priority?: boolean;
  /** The icon component for the media type (placeholder fallback). */
  TypeIcon: LucideIcon;
  /** Image size hint for Next.js Image component. */
  sizes?: string;
  /** Classes for the container div. */
  containerClassName?: string;
  /** Classes for the Image component. */
  imageClassName?: string;
}

/**
 * Renders the image or a placeholder for a media item.
 * @param props - The component props.
 * @param props.item - The media item to render.
 * @param props.isExport - Whether the image is for an export (screenshot).
 * @param props.resolvedUrl - A data URL to use directly if provided (useful for exports).
 * @param props.priority - Whether to load the image with high priority.
 * @param props.TypeIcon - The icon to use as a placeholder if the image fails to load.
 * @param props.sizes - Next.js image sizes attribute.
 * @param props.containerClassName - CSS classes for the image container.
 * @param props.imageClassName - CSS classes for the img element itself.
 */
export function MediaImage({
  item,
  isExport = false,
  resolvedUrl,
  priority = false,
  TypeIcon,
  sizes = '112px',
  containerClassName = 'absolute inset-0',
  imageClassName = 'object-cover',
}: MediaImageProps) {
  const [imageError, setImageError] = useState(() => {
    return item.imageUrl ? failedImages.has(item.imageUrl) : false;
  });
  const [retryUnoptimized, setRetryUnoptimized] = useState(false);

  // Export mode with resolved URL
  if (isExport && resolvedUrl) {
    return (
      <div className={containerClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedUrl}
          alt={item.title}
          className={`h-full w-full ${imageClassName}`}
          decoding="sync"
        />
      </div>
    );
  }

  // Standard Image mode
  if (item.imageUrl && !imageError) {
    return (
      <div className={containerClassName}>
        <Image
          src={item.imageUrl}
          alt={item.title}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={retryUnoptimized}
          className={`${imageClassName} pointer-events-none`}
          onError={() => {
            if (!retryUnoptimized) {
              setRetryUnoptimized(true);
            } else {
              if (item.imageUrl) failedImages.add(item.imageUrl);
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
      className={`${containerClassName} flex flex-col items-center justify-center overflow-hidden border border-neutral-800 bg-neutral-900 p-2 text-neutral-600`}
    >
      <TypeIcon size={24} className="mb-1 opacity-50" />
      {isExport && (
        <span className="mt-1 line-clamp-2 px-1 text-center text-[9px] leading-tight font-black uppercase opacity-30">
          {item.title}
        </span>
      )}
      <span className="mt-1 text-center text-[7px] leading-tight font-bold uppercase opacity-20">
        {item.type}
      </span>
    </div>
  );
}
