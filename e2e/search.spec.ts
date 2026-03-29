import { expect, test } from './fixtures';
import { mockSearchDynamic, mockSearchResults } from './utils/mocks';

test.describe('Search Functionality', () => {
  test.beforeEach(async () => {});

  test('should search and drag an item to a tier', async ({ page, boardPage, searchPanel }) => {
    await boardPage.goto();

    await mockSearchResults(page, [
      { id: 'item-1', title: 'Search Result', type: 'game', developer: 'Developer' },
    ]);

    await searchPanel.switchService('RAWG');
    await searchPanel.switchTab('game');
    await searchPanel.search('Test');
    await searchPanel.dragToTier('item-1', 'S');

    await expect(boardPage.getItemCard('item-1')).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate through different pages of results', async ({
    page,
    boardPage,
    searchPanel,
  }) => {
    await boardPage.goto();

    let callCount = 0;
    await mockSearchDynamic(page, (url) => {
      callCount++;
      const pageNum = url.searchParams.get('page') || '1';
      return {
        results: [{ id: `item-p${pageNum}`, title: `Item Page ${pageNum}`, type: 'game' }],
        page: Number.parseInt(pageNum),
        totalPages: 2,
      };
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

  test('should hide and show already added items', async ({ page, boardPage, searchPanel }) => {
    await boardPage.goto();

    // 1. Mock search to return one item
    await mockSearchResults(page, [{ id: 'duplicate-1', title: 'Unique Item', type: 'game' }]);

    await searchPanel.search('Unique');

    // 2. Add it to board
    const resultCard = await searchPanel.getResultCard('duplicate-1');
    await expect(resultCard).toBeVisible();
    await searchPanel.dragToTier('duplicate-1', 'S');

    // We expect the item to exist on the board now.
    const boardCard = page
      .locator('[data-tier-label="S"]')
      .getByTestId('item-card-rawg:game:duplicate-1');
    await expect(boardCard).toBeVisible({ timeout: 10_000 });
    // Verify it's actually in the tier, not just testing the drag overlay
    await boardPage.expectTierToHaveItemCount('S', 1);

    // dnd-kit globally suppresses click events for a few hundred milliseconds after a
    // drag operation completes (to prevent ghost clicks).
    // We use Playwright's expect.toPass() to retry the click until the suppression lifts
    // and the button state officially toggles.
    await expect(async () => {
      await searchPanel.setShowAdded(false);
      await expect(searchPanel.showAddedButton).toContainText('Show Added');
    }).toPass();

    // 4. Verify it's hidden in search results
    await expect(searchPanel.container.getByTestId('item-card-rawg:game:duplicate-1')).toBeHidden();

    // 5. Toggle "Show Added" (Show it)
    await searchPanel.setShowAdded(true);
    await expect(
      searchPanel.container.getByTestId('item-card-rawg:game:duplicate-1'),
    ).toBeVisible();
  });

  test('should use specific filters for a tab', async ({ page, boardPage, searchPanel }) => {
    await boardPage.goto();

    await page.route('**/api/search*', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ results: [], page: 1 }) });
    });

    await searchPanel.switchService('RAWG');
    await searchPanel.switchTab('game');
    await searchPanel.toggleFilters();

    // Use the Platform Select filter
    const platformSelect = page.getByRole('combobox');

    await expect(platformSelect).toBeVisible();

    await platformSelect.selectOption('4');

    const requestPromise = page.waitForRequest((req) => {
      const url = req.url();
      if (url.includes('/api/v2/search')) {
        console.log('[DEBUG-REQ]', url);
      }
      return url.includes('filters=') && url.includes('4');
    });

    await searchPanel.search('Cyberpunk');
    const request = await requestPromise;

    expect(request.url()).toContain('filters=');
    expect(request.url()).toContain('4');
  });
});
