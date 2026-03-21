/**
 * @file useTierListIO.ts
 * @description Encapsulates the logic for Importing and Exporting tier lists.
 * Handles JSON generation, file reading, validation, and browser downloads.
 * @module useTierListIO
 */

import { useCallback } from 'react';

import { downloadJson, generateExportData, parseImportData } from '@/infra/io';
import { logger } from '@/infra/logger';
import { BoardDispatch, importState } from '@/presentation/board/state/reducer';
import { TierListState } from '@/presentation/board/types';
import { useToast } from '@/presentation/ui/ToastProvider';

/**
 * Hook to handle Import and Export operations for the Tier List.
 * @param state - The current state of the tier list.
 * @param dispatch - Dispatcher for updating state.
 * @param pushHistory - Function to save current state to history.
 * @returns An object containing handler functions for import and export.
 */
export function useTierListIO(
  state: TierListState,
  dispatch: BoardDispatch,
  pushHistory?: () => void,
) {
  const { showToast } = useToast();

  /**
   * Generates a JSON export of the current tier list state and triggers a browser download.
   */
  const handleExport = useCallback(() => {
    try {
      const exportData = generateExportData(state);
      const filename = `moat-${new Date().toISOString().slice(0, 10)}.json`;
      downloadJson(exportData, filename);
      showToast('Tier list exported successfully!', 'success');
    } catch (error) {
      logger.error({ error }, 'Failed to export tier list');
      showToast('Failed to export tier list.', 'error');
    }
  }, [state, showToast]);

  /**
   * Handles the file selection event for importing a tier list from a JSON file.
   * Parses the file content and updates the application state.
   * @param e - The change event from the file input element.
   */
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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

          if (pushHistory) pushHistory();
          dispatch(importState({ state: newState }));

          showToast('Tier list imported successfully!', 'success');
        } catch (error) {
          logger.error({ error }, 'Failed to import JSON file');
          showToast('Invalid JSON file', 'error');
        }
      };
      reader.readAsText(file);
      // Reset input so same file can be selected again if needed
      e.target.value = '';
    },
    [dispatch, showToast, pushHistory],
  );

  /**
   * Publishes the current board state to the cloud.
   * @returns The generated share ID.
   */
  const handlePublish = useCallback(async () => {
    try {
      const response = await fetch('/api/share/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error({ error: errorData }, 'Publish API Error');
        throw new Error(errorData.error || 'Failed to publish board');
      }

      const data = await response.json();
      return data.id as string;
    } catch (error) {
      logger.error({ error }, 'Failed to publish board to cloud');
      showToast('Failed to publish board to cloud.', 'error');
      return null;
    }
  }, [state, showToast]);

  return {
    handleExport,
    handleImport,
    handlePublish,
  };
}
