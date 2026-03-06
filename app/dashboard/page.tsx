/**
 * @file page.tsx
 * @description Main dashboard page of the application.
 */

import { Dashboard } from '@/components/dashboard/Dashboard';


/**
 * Renders the application dashboard.
 * @returns The main dashboard page component.
 */
export default function Page() {
  return (
    <div className="flex h-screen w-full items-center justify-center p-4 xl:p-8">
      <Dashboard />
    </div>
  );
}
