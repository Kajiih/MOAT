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
 * @returns The rendered Tier List Application.
 */
export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params;

  return (
    <TierListProvider boardId={id}>
      <TierListApp />
    </TierListProvider>
  );
}
