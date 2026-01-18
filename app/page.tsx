/**
 * @file page.tsx
 * @description Main dashboard page of the application.
 */

import { MediaRegistryProvider } from '@/components/MediaRegistryProvider';
import TierListApp from '@/components/TierListApp';
import { TierListProvider } from '@/components/TierListContext';

/**
 * Renders the application dashboard.
 */
export default function Page() {
  return (
    <MediaRegistryProvider>
      <TierListProvider boardId="default">
        <TierListApp />
      </TierListProvider>
    </MediaRegistryProvider>
  );
}
