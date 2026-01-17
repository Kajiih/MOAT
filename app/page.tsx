/**
 * @file page.tsx
 * @description Main dashboard page of the application.
 */

import TierListApp from '@/components/TierListApp';
import { TierListProvider } from '@/components/TierListContext';
import { MediaRegistryProvider } from '@/components/MediaRegistryProvider';

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
