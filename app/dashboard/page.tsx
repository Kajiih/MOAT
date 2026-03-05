/**
 * @file page.tsx
 * @description Main dashboard page of the application.
 */

import { Dashboard } from '@/components/dashboard/Dashboard';
import { ItemRegistryProvider } from '@/components/providers/ItemRegistryProvider';

/**
 * Renders the application dashboard.
 * @returns The main dashboard page component.
 */
export default function Page() {
  return (
    <ItemRegistryProvider>
      <Dashboard />
    </ItemRegistryProvider>
  );
}
