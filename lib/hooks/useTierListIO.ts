/**
 * @file useTierListIO.ts
 * @description Encapsulates the logic for Importing and Exporting tier lists.
 * Handles JSON generation, file reading, validation, and browser downloads.
 * @module useTierListIO
 */

import { useCallback } from 'react';
import { TierListState } from '@/lib/types';
import { generateExportData, downloadJson, parseImportData } from '@/lib/utils/io';
import { useToast } from '@/components/ToastProvider';

/**
 * Hook to handle Import and Export operations for the Tier List.
 * 
 * @param state - The current state of the tier list.
 * @param setState - Function to update the tier list state.
 * @returns An object containing handler functions for import and export.
 */
export function useTierListIO(
  state: TierListState,
  setState: React.Dispatch<React.SetStateAction<TierListState>>
) {
  const { showToast } = useToast();

  /**
   * Generates a JSON export of the current tier list state and triggers a browser download.
   */
  const handleExport = useCallback(() => {
    try {
      const exportData = generateExportData(state);
      const filename = `moat-${new Date().toISOString().slice(0,10)}.json`;
      downloadJson(exportData, filename);
      showToast("Tier list exported successfully!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to export tier list.", "error");
    }
  }, [state, showToast]);

  /**
   * Handles the file selection event for importing a tier list from a JSON file.
   * Parses the file content and updates the application state.
   * 
   * @param e - The change event from the file input element.
   */
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const jsonString = ev.target?.result as string;
            // Note: We might want to pass the initial title or handle it differently if needed,
            // but here we just use the current state's title or a default as fallback during parsing logic if implemented.
            // The original logic used INITIAL_STATE.title as fallback.
            const newState = parseImportData(jsonString, 'Untitled Tier List');
            
            setState(newState);
            showToast("Tier list imported successfully!", "success");
        } catch (e) { 
            console.error(e);
            showToast("Invalid JSON file", "error"); 
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  }, [setState, showToast]);

  return {
    handleExport,
    handleImport
  };
}
