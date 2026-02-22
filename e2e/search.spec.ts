import { expect, test } from '@playwright/test';

import { BoardPage } from './pom/BoardPage';
import { SearchPanel } from './pom/SearchPanel';
import { clearBrowserStorage } from './utils/storage';

test.describe('Search Functionality', () => {
  let boardPage: BoardPage;
  let searchPanel: SearchPanel;

  test.beforeEach(async ({ page }) => {
    await clearBrowserStorage(page);
    boardPage = new BoardPage(page);
    searchPanel = new SearchPanel(page);
    await boardPage.goto();
  });

  test('should search and drag an item to a tier', async ({ page }) => {
    await page.route('**/api/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ id: 'item-1', title: 'Search Result', type: 'song', artist: 'Artist' }],
          page: 1,
        }),
      });
    });

    await searchPanel.switchTab('song');
    await searchPanel.search('Test');
    await searchPanel.dragToTier('item-1', 'S');

    await expect(page.getByTestId('media-card-item-1')).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate through different pages of results', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/search*', async (route) => {
      callCount++;
      const url = new URL(route.request().url());
      const pageNum = url.searchParams.get('page') || '1';
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ id: `item-p${pageNum}`, title: `Item Page ${pageNum}`, type: 'song' }],
          page: Number.parseInt(pageNum),
          totalPages: 2,
        }),
      });
    });

    await searchPanel.search('MultiPage');
    await expect(page.getByText('Item Page 1')).toBeVisible();

    // Click Next Page
    const nextButton = page.getByTitle('Next page');
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    await expect(page.getByText('Item Page 2')).toBeVisible();
    expect(callCount).toBeGreaterThan(1);
  });

  test('should hide and show already added items', async ({ page }) => {
    // 1. Mock search to return one item
    await page.route('**/api/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ id: 'duplicate-1', title: 'Unique Item', type: 'song' }],
          page: 1,
        }),
      });
    });

    await searchPanel.search('Unique');
    
    // 2. Add it to board
    const resultCard = await searchPanel.getResultCard('duplicate-1');
    await expect(resultCard).toBeVisible();
    await searchPanel.dragToTier('duplicate-1', 'S');
    // We expect the item to exist on the board now.
    await expect(page.locator('[data-tier-label="S"]').getByTestId('media-card-duplicate-1')).toBeVisible({ timeout: 10_000 });
    // Verify it's actually in the tier, not just testing the drag overlay
    await expect(page.locator('[data-tier-label="S"]').getByTestId(/^media-card-/)).toHaveCount(1);

    // Give the dnd-kit drop animation time to fully complete and unmount
    // This is required because the DragOverlay shares the same DOM ID ('media-card-duplicate-1') as the board item
    // You cannot simply use `toHaveCount(1)` because the count is 1 *during* the drag (just the clone),
    // then 2 when it hits the board, then returns to 1 when the clone fades.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);

    // 3. Toggle "Show Added" (Hide it)
    await expect(searchPanel.showAddedButton).toBeVisible();
    await searchPanel.setShowAdded(false);
    
    // VERIFY state actually toggled
    await expect(searchPanel.showAddedButton).toContainText('Show Added');

    // 4. Verify it's hidden in search results
    await expect(page.getByTestId('media-card-search-duplicate-1')).toBeHidden();

    // 5. Toggle "Show Added" (Show it)
    await searchPanel.setShowAdded(true);
    await expect(page.getByTestId('media-card-search-duplicate-1')).toBeVisible();
  });

  test('should use specific filters for a tab', async ({ page }) => {
    let capturedUrl: string | undefined;
    await page.route('**/api/search*', async (route) => {
      capturedUrl = route.request().url();
      await route.fulfill({ status: 200, body: JSON.stringify({ results: [], page: 1 }) });
    });

    await searchPanel.switchTab('artist');
    await searchPanel.toggleFilters();

    // Find a filter specific to artist (e.g. Country or Type)
    // Based on ARCHITECTURE: "Artists: Filter    // Use the Country filter which is a text input with a specific placeholder
    const countryInput = page.getByPlaceholder('e.g. US, GB, JP...');
    
    await expect(countryInput).toBeVisible();
    await countryInput.fill('FR');
    await searchPanel.search('Frenchie');
      
    expect(capturedUrl).toContain('artistCountry=FR');
  });
});
