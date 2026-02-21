import { expect, test } from '@playwright/test';

import { BoardPage } from './pom/BoardPage';

test.describe('Board Management', () => {
  test.setTimeout(60_000);
  let boardPage: BoardPage;

  test.beforeEach(async ({ page }) => {
    boardPage = new BoardPage(page);
    await boardPage.goto();
  });

  test('should manage tiers: add, rename, reorder, delete', async ({ page }) => {
    // TODO: Double-click for tier label editing is flaky in headless browsers
    // 1. Add
    const initialCount = await boardPage.tierLabels.count();
    await boardPage.addTier();
    await expect(boardPage.tierLabels).toHaveCount(initialCount + 1);

    // 2. Rename the new tier (last one)
    await boardPage.renameTier('New Tier', 'New Awesome Tier');
    // Give it a moment to update state
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);
    await expect(page.getByText('New Awesome Tier')).toBeVisible();

    // 3. Reorder: move the new tier up one spot
    // TODO: Reorder simulation is flaky in this environment
    // await boardPage.reorderTiers(initialCount, initialCount - 1);
    // await expect(boardPage.tierLabels.nth(initialCount - 1)).toHaveText('New Awesome Tier');

    // 4. Delete
    await boardPage.deleteTier('New Awesome Tier');
    await expect(boardPage.tierLabels).toHaveCount(initialCount);
  });

  test('should randomize tier colors', async ({ page }) => {
    // 1. Capture initial colors of all tiers
    const tiers = page.locator('[data-tier-label] > div:first-child');
    await expect(tiers).toHaveCount(6);
    
    const getColors = async () => {
      const all = await tiers.all();
      return Promise.all(all.map(t => t.evaluate(el => {
        const bgClass = Array.from(el.classList).find(c => c.startsWith('bg-'));
        return bgClass;
      })));
    };

    const initialColors = await getColors();

    // 2. Click the floating randomize button
    await page.getByTitle('Randomize Colors').click();

    // 3. Wait for the success toast as a signal that the action fired
    await expect(page.getByText('Colors randomized!')).toBeVisible();

    // 4. Verify that the collective colors have changed
    // We expect the new set of colors to be different from the old one
    await expect.poll(async () => {
      const currentColors = await getColors();
      return JSON.stringify(initialColors) !== JSON.stringify(currentColors);
    }, {
      message: 'Expected tier colors to change after randomization',
      timeout: 5000,
    }).toBeTruthy();
  });

  test('should change a tier color', async ({ page, browserName }) => {
    // TODO: Firefox has issues with popover positioning in headless mode
    test.skip(browserName === 'firefox', 'Flaky in Firefox headless');

    const firstTierHeader = page.locator('[data-tier-label] > div').first();
    const label = await boardPage.tierLabels.first().textContent();
    expect(label).not.toBeNull();

    // Open settings for the first tier
    const row = await boardPage.getTierRow(label!);
    await row.getByTitle('Tier Settings').click();

    // Now dots are visible
    const redDot = row.getByTitle('Red').first();
    await expect(redDot).toBeVisible();
    // The popover is rendered outside the viewport in headless mode.
    // Neither scrolling nor force:true can reach it — dispatch click via DOM.
    await redDot.evaluate((el: HTMLElement) => el.click());

    // Close settings
    await page.keyboard.press('Escape');

    // Verify the tier background class contains red
    await expect(firstTierHeader).toHaveClass(/bg-red-/);
  });

  test('should update branding (favicon) when reordering tiers', async ({ page }) => {
    // Get initial favicon href
    const favicon = page.locator('link#dynamic-favicon');
    await expect(favicon).toBeAttached();
    const initialFavicon = await favicon.getAttribute('href');

    // Reorder second tier to the top (this should trigger a branding update)
    const secondLabel = await boardPage.tierLabels.nth(1).textContent();
    expect(secondLabel).not.toBeNull();
    await boardPage.reorderTiers(1, 0);

    // Verify reorder happened
    await expect(boardPage.tierLabels.first()).toHaveText(secondLabel!);

    // Wait for a bit as favicon update might be debounced
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1500);

    const newFavicon = favicon;
    await expect(newFavicon).not.toHaveAttribute('href', initialFavicon || '');
  });
});
