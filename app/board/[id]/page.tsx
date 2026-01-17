/**
 * @file page.tsx
 * @description Page component for a specific tier list board.
 */

import TierListApp from '@/components/TierListApp';
import { TierListProvider } from '@/components/TierListContext';

interface BoardPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Renders the Tier List Application for a specific board ID.
 * @param props - Component props.
 * @param props.params - The route parameters.
 */
export default async function BoardPage({ params }: BoardPageProps) {
  // In Next.js 15+, params is a Promise
  const { id } = await params;

  return (
    <TierListProvider boardId={id}>
      <TierListApp />
    </TierListProvider>
  );
}
