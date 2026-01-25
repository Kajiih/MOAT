/**
 * @file page.tsx
 * @description Root entry point. Automatically redirects to the most recent board or creates a new one.
 */

'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useBoardRegistry } from '@/lib/hooks/useBoardRegistry';
import { logger } from '@/lib/logger';

export default function Page() {
  const router = useRouter();
  const { boards, isLoading, createBoard } = useBoardRegistry();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading || hasRedirected.current) return;

    const handleRedirect = async () => {
      hasRedirected.current = true;
      if (boards.length > 0) {
        // Redirect to most recently modified board (boards are already sorted by lastModified in hook)
        router.replace(`/board/${boards[0].id}`);
      } else {
        // Create new board
        try {
          const id = await createBoard('Untitled Board');
          router.replace(`/board/${id}`);
        } catch (error) {
          logger.error({ error }, 'Failed to create board');
          // Allow retry if something transient failed
          hasRedirected.current = false;
        }
      }
    };

    handleRedirect();
  }, [boards, isLoading, createBoard, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-500">
      <Loader2 className="mr-2 animate-spin" />
      <span>Loading...</span>
    </div>
  );
}
