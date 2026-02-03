import { expect, test } from '@playwright/test';

import { BoardPage } from './pom/BoardPage';

test.describe('Board Management', () => {
  let boardPage: BoardPage;

  test.beforeEach(async ({ page }) => {
    boardPage = new BoardPage(page);
    await boardPage.goto();
  });

  test('should manage tiers: add, rename, reorder, delete', async ({ page }) => {
    // 1. Add
    const initialCount = await boardPage.tierLabels.count();
    await boardPage.addTier();
    await expect(boardPage.tierLabels).toHaveCount(initialCount + 1);

    // 2. Rename the new tier (last one)
    await boardPage.renameTier('New Tier', 'New Awesome Tier');
    // Give it a moment to update state
    await page.waitForTimeout(500);
    await expect(page.getByText('New Awesome Tier')).toBeVisible();

    // 3. Reorder: move the new tier to the top
    await boardPage.reorderTiers(initialCount, 0);
    await expect(boardPage.tierLabels.first()).toHaveText('New Awesome Tier');

    // 4. Delete
    await boardPage.deleteTier('New Awesome Tier');
    await expect(boardPage.tierLabels).toHaveCount(initialCount);
  });

  test('should randomize tier colors', async ({ page }) => {
    const firstDot = page.getByTestId('tier-color-dot').first();
    const initialStyle = await firstDot.getAttribute('style');
    
    // Click the floating randomize button directly
    await page.getByTitle('Randomize Colors').click();
    
    // Check that at least the first dot changed style (highly probable with randomization)
    const newStyle = firstDot;
    await expect(newStyle).not.toHaveAttribute('style', initialStyle);
  });

  test('should change a tier color', async ({ page }) => {
    const firstDot = page.getByTestId('tier-color-dot').first();
    const initialStyle = await firstDot.getAttribute('style');
    
    await firstDot.click();
    // Assuming it cycles or randomizes on click if no picker is specified
    const newStyle = firstDot;
    await expect(newStyle).not.toHaveAttribute('style', initialStyle);
  });

  test('should update branding (favicon) when reordering tiers', async ({ page }) => {
    // Get initial favicon href
    const favicon = page.locator('link#dynamic-favicon');
    await expect(favicon).toBeAttached();
    const initialFavicon = await favicon.getAttribute('href');
    
    // Reorder second tier to the top (this should trigger a branding update)
    const secondLabel = await boardPage.tierLabels.nth(1).innerText();
    await boardPage.reorderTiers(1, 0);
    
    // Verify reorder happened
    await expect(boardPage.tierLabels.first()).toHaveText(secondLabel);
    
    // Wait for a bit as favicon update might be debounced
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1500);

    const newFavicon = favicon;
    await expect(newFavicon).not.toHaveAttribute('href', initialFavicon);
  });
});
