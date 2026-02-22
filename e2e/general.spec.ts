import { expect, test } from '@playwright/test';

import { BoardPage } from './pom/BoardPage';
import { SearchPanel } from './pom/SearchPanel';
import { clearBrowserStorage, waitForStorageValue } from './utils/storage';

test.describe('General Board Actions', () => {
  let boardPage: BoardPage;
  let searchPanel: SearchPanel;

  test.beforeEach(async ({ page }) => {
    await clearBrowserStorage(page);
    boardPage = new BoardPage(page);
    searchPanel = new SearchPanel(page);
    await boardPage.goto();
  });

  test('should rename a tier list and reflect in document title', async ({ page }) => {
    const newTitle = 'My Epic Tier List';
    await boardPage.setBoardTitle(newTitle);
    
    await expect(boardPage.titleInput).toHaveValue(new RegExp(newTitle));
    await expect(page).toHaveTitle(new RegExp(newTitle));
  });

  test('should clear a tier list with items in it', async ({ page }) => {
    // 1. Add an item first
    await page.route('**/api/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ id: 'item-1', title: 'Test Item', type: 'song', artist: 'Artist' }],
          page: 1,
        }),
      });
    });

    await searchPanel.switchTab('song');
    await searchPanel.search('Test');
    await searchPanel.dragToTier('item-1', 'S');
    await expect(page.getByTestId('media-card-item-1')).toBeVisible({ timeout: 10_000 });

    // 2. Clear board
    await boardPage.clearBoard();

    // 3. Verify item is gone
    await expect(page.getByTestId('media-card-item-1')).toBeHidden();
  });

  test('should persist data after reload', async ({ page }) => {
    const uniqueTitle = `Persist Test ${Date.now()}`;
    await boardPage.setBoardTitle(uniqueTitle);
    await boardPage.addTier();
    await expect(boardPage.tierLabels).toHaveCount(7);

    // Get the dynamic board ID from the URL reliably
    const urlParts = page.url().split('/').filter(Boolean);
    const boardId = urlParts[urlParts.length - 1];
    
    // console.log(`E2E: Persisting board ${boardId} with title ${uniqueTitle}`);

    // Wait for debounce and persistence using polling
    await waitForStorageValue(page, `moat-board-${boardId}`, (state: any) => {
      if (!state) return false;
      const titleMatch = state.title === uniqueTitle;
      const countMatch = state.tierDefs?.length === 7;
      // if (titleMatch && countMatch) console.log(`E2E: Found correct state in IDB! Title: ${state.title}, Tiers: ${state.tierDefs.length}`);
      return titleMatch && countMatch;
    });

    await page.reload();
    // Ensure board is re-hydrated
    await expect(boardPage.titleInput).toBeVisible();
    
    const currentUrl = page.url();
    // console.log(`E2E: Reloaded. Current URL: ${currentUrl}`);
    
    await expect(boardPage.titleInput).toHaveValue(uniqueTitle);
    await expect(boardPage.tierLabels).toHaveCount(7);
  });
});
