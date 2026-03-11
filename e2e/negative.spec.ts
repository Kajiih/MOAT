import { expect, test } from './fixtures';
import { mockSearchResults } from './utils/mocks';

test.describe('Resilience and Failure Modes', () => {
  test.beforeEach(async () => {});

  test('should display toast error when search API fails', async ({
    page,
    boardPage,
    searchPanel,
  }) => {
    await boardPage.goto();

    // Route search API to simulate a 503 Service Unavailable (MusicBrainz rate limit)
    await page.route('**/api/search*', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' }),
      });
    });

    // Trigger a search
    await searchPanel.search('Fail Test');

    // The app should not crash; it should display an inline error message
    const errorToast = page.getByText(/Service Unavailable/i);
    await expect(errorToast).toBeVisible();

    // App should still be functional (empty state should render instead of exploding)
    await expect(page.getByText('No results found.')).toBeVisible();
  });

  test('should display toast error when fetching item details fails', async ({
    page,
    boardPage,
    searchPanel,
  }) => {
    await boardPage.goto();

    // Set up a normal search result so we have something to drag
    await mockSearchResults(page, [
      { id: 'error-item-1', title: 'Error Item', type: 'game' },
    ]);

    await searchPanel.search('ErrorItem');
    const resultCard = await searchPanel.getResultCard('error-item-1');
    await expect(resultCard).toBeVisible();

    // Mock the details route to fail with 404 BEFORE dragging
    // Otherwise `useLegacyBackgroundEnrichment` will attempt to fetch the real API immediately on drop
    await page.route('**/api/details*', async (route) => {
      await route.fulfill({ status: 404, body: 'Not found' });
    });

    // Now drag it to the board
    await searchPanel.dragToTier('error-item-1', 'S');
    const boardCard = page.locator('[data-tier-label="S"]').getByTestId('item-card-rawg:game:error-item-1');
    await expect(boardCard).toBeVisible({ timeout: 10_000 });

    // Attempt to open details
    await boardCard.hover();
    const detailsButton = boardCard.getByRole('button', { name: /Details/i });
    await expect(detailsButton).toBeVisible();
    await detailsButton.click();

    // Verify dialog opens
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Verify it handles the details fetch failure properly (inline error message)
    await expect(async () => {
      const errorMsg = dialog.getByText(/Failed to load additional details/i);
      await expect(errorMsg).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10_000 });

    // The details modal probably opens anyway but with basic info (which is fine, it shouldn't crash)
    await expect(dialog.getByText('Error Item')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
