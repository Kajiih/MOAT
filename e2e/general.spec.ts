import { expect, test } from './fixtures';
import { mockSearchResults } from './utils/mocks';
import { waitForStorageValue } from './utils/storage';

test.describe('General Board Actions', () => {

  test('should rename a tier list and reflect in document title', async ({ page, boardPage }) => {
    await boardPage.goto();
    const newTitle = 'My Epic Tier List';
    await boardPage.setBoardTitle(newTitle);
    
    await expect(boardPage.titleInput).toHaveValue(new RegExp(newTitle));
    await expect(page).toHaveTitle(new RegExp(newTitle));
  });

  test('should clear a tier list with items in it', async ({ page, boardPage, searchPanel }) => {
    await boardPage.goto();

    // 1. Add an item first
    await mockSearchResults(page, [
      { id: 'item-1', title: 'Test Item', type: 'song', artist: 'Artist' },
    ]);

    await searchPanel.switchTab('song');
    await searchPanel.search('Test');
    await searchPanel.dragToTier('item-1', 'S');
    await expect(page.getByTestId('media-card-item-1')).toBeVisible({ timeout: 10_000 });

    // 2. Clear board
    await boardPage.clearBoard();

    // 3. Verify item is gone
    await expect(page.getByTestId('media-card-item-1')).toBeHidden();
  });

  test('should persist data after reload', async ({ page, boardPage }) => {
    await boardPage.goto();
    const uniqueTitle = `Persist Test ${Date.now()}`;
    await boardPage.setBoardTitle(uniqueTitle);
    await boardPage.addTier();
    await expect(boardPage.tierLabels).toHaveCount(7);

    // Get the dynamic board ID from the URL reliably
    const boardId = page.url().split('/').findLast(Boolean);

    // Wait for debounce and persistence using polling
    await waitForStorageValue(page, `moat-board-${boardId}`, (state: Record<string, unknown> | undefined) => {
      if (!state) return false;
      const titleMatch = state.title === uniqueTitle;
      const tierDefs = state.tierDefs as unknown[] | undefined;
      const countMatch = tierDefs?.length === 7;
      return !!titleMatch && !!countMatch;
    });

    await page.reload();
    // Ensure board is re-hydrated
    await expect(boardPage.titleInput).toBeVisible();
    
    await expect(boardPage.titleInput).toHaveValue(uniqueTitle);
    await expect(boardPage.tierLabels).toHaveCount(7);
  });
});
