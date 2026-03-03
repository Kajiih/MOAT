/**
 * @file LegacyMediaImage.tsx
 * @description [LEGACY V1] Image component for the previous media architecture.
 * Supports the old MediaItem format and direct image URLs.
 * @deprecated Use the new MediaImage component for V2 StandardItems.
 */

'use client';

import { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { failedImages } from '@/lib/image-cache';
import { MediaItem } from '@/lib/types';
import { StandardItem } from '@/lib/database/types';

/**
 * Props for the LegacyMediaImage component.
 */
interface LegacyMediaImageProps {
  /** The item to render. Supports both V1 and V2 for backward compatibility. */
  item: MediaItem | StandardItem;
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
 * Renders the image or a placeholder for a media item using the legacy V1 logic.
 * @param props - The component props.
 * @returns The rendered legacy media image or placeholder.
 */
export function LegacyMediaImage({
  item,
  isExport = false,
  resolvedUrl,
  priority = false,
  TypeIcon,
  sizes = '112px',
  containerClassName = 'absolute inset-0',
  imageClassName = 'object-cover',
}: LegacyMediaImageProps) {
  const imageUrl =
    'images' in item
      ? (item.images as any[]).find((img) => img.type === 'url')?.url
      : (item as any).imageUrl;

  const [imageError, setImageError] = useState(() => {
    return imageUrl ? failedImages.has(imageUrl) : false;
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
  if (imageUrl && !imageError) {
    return (
      <div className={containerClassName}>
        <Image
          src={imageUrl}
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
              if (imageUrl) failedImages.add(imageUrl);
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
        {'type' in item ? item.type : item.identity.entityId}
      </span>
    </div>
  );
}
