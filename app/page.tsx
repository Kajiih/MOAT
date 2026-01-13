import TierListApp from '@/components/TierListApp';
import { TierListProvider } from '@/components/TierListContext';

export default function Page() {
  return (
    <TierListProvider>
      <TierListApp />
    </TierListProvider>
  );
}
