/**
 * @file UserPreferencesProvider.tsx
 * @description Context provider for managing global user settings, such as advanced mode.
 */

'use client';

import React, { createContext, useContext } from 'react';

import { usePersistentState } from '@/lib/hooks';

interface UserPreferencesContextType {
  /** Whether advanced UI features and settings are shown. */
  showAdvanced: boolean;
  /** Toggles the advanced mode state. */
  setShowAdvanced: (value: boolean) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

/**
 * Hook to consume user preferences.
 */
export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}

interface UserPreferencesProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for user preferences.
 * @param props - Component props.
 * @param props.children - Child elements.
 * @returns The provider element.
 */
export function UserPreferencesProvider({ children }: UserPreferencesProviderProps) {
  const [showAdvanced, setShowAdvanced] = usePersistentState<boolean>(
    'moat-user-pref-advanced',
    false
  );

  return (
    <UserPreferencesContext.Provider value={{ showAdvanced, setShowAdvanced }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}
