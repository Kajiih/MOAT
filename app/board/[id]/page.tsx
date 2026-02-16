/**
 * @file page.tsx
 * @description Page component for a specific tier list board.
 */

import { TierListProvider } from '@/components/providers/TierListContext';
import TierListApp from '@/components/TierListApp';

interface BoardPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Renders the Tier List Application for a specific board ID.
 * @param props - Component props.
 * @param props.params - The route parameters.
 * @returns The rendered Tier List Application.
 */
export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params;

  return (
    <TierListProvider key={id} boardId={id}>
      <TierListApp />
    </TierListProvider>
  );
}
