import TierListApp from '@/components/TierListApp';
import { TierListProvider } from '@/components/TierListContext';

interface BoardPageProps {
    params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  // In Next.js 15+, params is a Promise
  const { id } = await params;

  return (
    <TierListProvider boardId={id}>
      <TierListApp />
    </TierListProvider>
  );
}
