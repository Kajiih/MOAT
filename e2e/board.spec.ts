import { expect, test } from './fixtures';

test.describe('Board Management', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {});

  test('should manage tiers: add, rename, reorder, delete', async ({ page, boardPage }) => {
    await boardPage.goto();

    // TODO: Double-click for tier label editing is flaky in headless browsers
    // 1. Add
    const initialCount = await boardPage.tierLabels.count();
    await boardPage.addTier();
    await expect(boardPage.tierLabels).toHaveCount(initialCount + 1);

    // 2. Rename the new tier (last one)
    await boardPage.renameTier('New Tier', 'New Awesome Tier');
    await expect(page.getByText('New Awesome Tier')).toBeVisible();

    // 3. Reorder: move the new tier up ONE spot for better stability
    const newIndex = (await boardPage.tierLabels.count()) - 1;
    const targetIndex = newIndex - 1;
    await boardPage.reorderTiersViaKeyboard(newIndex, targetIndex);
    await expect(boardPage.tierLabels.nth(targetIndex)).toHaveText('New Awesome Tier');

    // 4. Delete
    await boardPage.deleteTier('New Awesome Tier');
    await expect(boardPage.tierLabels).toHaveCount(initialCount);
  });

  test('should randomize tier colors', async ({ page, boardPage }) => {
    await boardPage.goto();

    // 1. Capture initial colors of all tiers
    const tiers = page.locator('[data-tier-label] > div:first-child');
    await expect(tiers).toHaveCount(6);

    const getColors = async () => {
      const all = await tiers.all();
      return Promise.all(
        all.map((t) =>
          t.evaluate((el) => {
            const bgClass = [...el.classList].find((c) => c.startsWith('bg-'));
            return bgClass;
          }),
        ),
      );
    };

    const initialColors = await getColors();

    // 2. Click the floating randomize button
    await page.getByTitle('Randomize Colors').click();

    // 3. Wait for the success toast as a signal that the action fired
    await expect(page.getByText('Colors randomized!')).toBeVisible();

    // 4. Verify that the collective colors have changed
    // We expect the new set of colors to be different from the old one
    await expect
      .poll(
        async () => {
          const currentColors = await getColors();
          return JSON.stringify(initialColors) !== JSON.stringify(currentColors);
        },
        {
          message: 'Expected tier colors to change after randomization',
          timeout: 5000,
        },
      )
      .toBeTruthy();
  });

  test('should change a tier color', async ({ page, boardPage, browserName }) => {
    await boardPage.goto();

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

  test('should update branding (favicon) when reordering tiers', async ({ page, boardPage }) => {
    await boardPage.goto();

    // Get initial favicon href
    const favicon = page.locator('link#dynamic-favicon');
    await expect(favicon).toBeAttached();
    const initialFavicon = await favicon.getAttribute('href');

    // Reorder second tier to the top (this should trigger a branding update)
    const secondLabel = await boardPage.tierLabels.nth(1).textContent();
    expect(secondLabel).not.toBeNull();
    await boardPage.reorderTiersViaKeyboard(1, 0);

    // Verify reorder happened
    await expect(boardPage.tierLabels.first()).toHaveText(secondLabel!);

    // Wait for the favicon to update (it is debounced in the app)
    await expect
      .poll(
        async () => {
          return favicon.getAttribute('href');
        },
        {
          message: 'Favicon should update after tier reorder',
          timeout: 5000,
        },
      )
      .not.toBe(initialFavicon);
  });
});
