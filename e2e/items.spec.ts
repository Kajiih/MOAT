import { expect, test } from '@playwright/test';

import { DashboardPage } from './pom/DashboardPage';
import { SearchPanel } from './pom/SearchPanel';
import { BoardPage } from './pom/BoardPage';

test.describe('Item Management', () => {
  test.setTimeout(60_000);
  let dashboardPage: DashboardPage;
  let boardPage: BoardPage;
  let searchPanel: SearchPanel;

  test.beforeEach(async ({ page }) => {
    // Clear storage to ensure test isolation
    await page.goto('/');
    await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();
      // Clear IndexedDB
      const dbs = await window.indexedDB.databases();
      dbs.forEach(db => { if (db.name) window.indexedDB.deleteDatabase(db.name); });
    });

    dashboardPage = new DashboardPage(page);
    boardPage = new BoardPage(page);
    searchPanel = new SearchPanel(page);
    
    await dashboardPage.goto();
    await dashboardPage.createBoard('Item Management Test');
    
    // Setup: Add two items to tier S
    await page.route('**/api/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            { id: 'item-1', mbid: 'item-1', title: 'First Item', type: 'song', artist: 'Artist 1' },
            { id: 'item-2', mbid: 'item-2', title: 'Second Item', type: 'song', artist: 'Artist 2' },
          ],
          page: 1,
          totalPages: 1,
          totalCount: 2,
        }),
      });
    });

    await searchPanel.search('Setup');
    await expect(await searchPanel.getResultCard('item-1')).toBeVisible();
    await expect(await searchPanel.getResultCard('item-2')).toBeVisible();

    await searchPanel.dragToTier('item-1', 'S');
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500); 
    await expect(page.getByTestId('media-card-item-1')).toBeVisible({ timeout: 15_000 });

    // Small delay between drags
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);

    await searchPanel.dragToTier('item-2', 'S');
    await expect(page.getByTestId('media-card-item-2')).toBeVisible({ timeout: 10_000 });
    
    // Wait for state to settle before running tests
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);
  });

  test('should manage items: details, move, reorder, remove', async ({ page }) => {
    // TODO: dnd-kit drag simulations are flaky in headless browsers
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
          mbid: 'item-1',
          title: 'First Item',
          type: 'song',
          artist: 'Artist 1',
          description: 'A very detailed description',
        }),
      });
    });

    const card1 = page.getByTestId('media-card-item-1');
    await expect(card1).toBeVisible({ timeout: 15_000 });
    
    // Open details via button (more reliable than shortcut in tests)
    await card1.hover();
    await card1.getByRole('button', { name: /View details/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('First Item');
    await expect(dialog).toContainText('Artist 1');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // 2. Reorder in S
    await expect(cards).toHaveCount(2);
    // Drag item-2 (index 1) to position of item-1 (index 0)
    await boardPage.reorderItems('S', 1, 0);
    await expect(cards.nth(0)).toContainText('Second Item');

    // 3. Move from S to A
    await boardPage.moveItemToTier('item-1', 'A');
    await expect(tierA).toContainText('First Item');
    await expect(tierS).not.toContainText('First Item');

    // 4. Remove
    await card1.click();
    await page.keyboard.press('x');
    await expect(card1).toBeHidden();
  });

  test('should handle personal notes', async ({ page }) => {
    const card1 = page.getByTestId('media-card-item-1');
    await expect(card1).toBeVisible({ timeout: 15_000 });

    // Route API before opening the modal
    await page.route('**/api/details*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'item-1',
          mbid: 'item-1',
          title: 'First Item',
          type: 'song',
          artist: 'Artist 1',
          description: 'A very detailed description',
        }),
      });
    });

    // Open details via button (more reliable than shortcut in tests)
    await card1.hover();
    await card1.getByRole('button', { name: /View details/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Type a note
    const notesEditor = page.getByPlaceholder(/write your thoughts/i);
    await expect(notesEditor).toBeVisible();
    await notesEditor.fill('This is a test note for item 1');
    
    // Close modal — the unmount flush handler persists the note immediately
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // The notes indicator badge should now be visible on the card
    await expect(card1.getByTestId('notes-indicator')).toBeVisible();
  });
});
