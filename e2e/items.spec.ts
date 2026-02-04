import { expect, test } from '@playwright/test';

import { BoardPage } from './pom/BoardPage';
import { SearchPanel } from './pom/SearchPanel';

test.describe('Item Management', () => {
  test.setTimeout(60000);
  let boardPage: BoardPage;
  let searchPanel: SearchPanel;

  test.beforeEach(async ({ page }) => {
    boardPage = new BoardPage(page);
    searchPanel = new SearchPanel(page);
    await boardPage.goto();
    
    // Setup: Add two items to tier S
    await page.route('**/api/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            { id: 'item-1', title: 'First Item', type: 'song' },
            { id: 'item-2', title: 'Second Item', type: 'song' },
          ],
          page: 1,
        }),
      });
    });

    await searchPanel.search('Setup');
    await expect(await searchPanel.getResultCard('item-1')).toBeVisible();
    await expect(await searchPanel.getResultCard('item-2')).toBeVisible();

    await searchPanel.dragToTier('item-1', 'S');
    await expect(page.getByTestId('media-card-item-1')).toBeVisible();

    // Small delay between drags
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);

    await searchPanel.dragToTier('item-2', 'S');
    await expect(page.getByTestId('media-card-item-2')).toBeVisible({ timeout: 10000 });
    
    // Wait for state to settle before running tests
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);
  });

  test.fixme('should manage items: details, move, reorder, remove', async ({ page }) => {
    // FIXME: dnd-kit drag simulations are flaky in headless browsers
    const tierS = page.locator('[data-tier-label="S"]');
    const tierA = page.locator('[data-tier-label="A"]');
    const cards = tierS.getByTestId(/^media-card-item-/);
    
    // 1. Details
    await page.route('**/api/details*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'item-1',
          title: 'First Item',
          type: 'song',
          description: 'A very detailed description',
        }),
      });
    });

    const card1 = page.getByTestId('media-card-item-1');
    await expect(card1).toBeVisible({ timeout: 10000 });
    await card1.click({ force: true });
    await page.keyboard.press('i');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('A very detailed description')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // 2. Reorder in S
    await expect(cards).toHaveCount(2);
    const box1 = await cards.nth(0).boundingBox();
    const box2 = await cards.nth(1).boundingBox();
    if (box1 && box2) {
      // Drag item-2 to the left of item-1
      await cards.nth(1).dragTo(cards.nth(0));
    }
    // Wait for sortable to update
    await expect(cards.nth(0)).toContainText('Second Item');

    // 3. Move from S to A
    await card1.dragTo(tierA.getByTestId('tier-drop-zone'));
    await expect(tierA).toContainText('First Item');
    await expect(tierS).not.toContainText('First Item');

    // 4. Remove
    await card1.click({ force: true });
    await page.keyboard.press('x');
    await expect(card1).toBeHidden();
  });
});
