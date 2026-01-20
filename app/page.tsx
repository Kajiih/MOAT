/**
 * @file page.tsx
 * @description Main dashboard page of the application.
 */

import { MediaRegistryProvider } from '@/components/MediaRegistryProvider';
import TierListApp from '@/components/TierListApp';
import { TierListProvider } from '@/components/TierListContext';

/**
 * Renders the application dashboard.
 * @returns The main dashboard page component.
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
