import { expect, test } from './fixtures';
import { mockItemDetails, mockSearchResults } from './utils/mocks';

test.describe('Item Management', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page, dashboardPage, searchPanel }) => {
    await dashboardPage.goto();
    await dashboardPage.createBoard('Item Management Test');

    // Setup: Add two items to tier S
    await mockSearchResults(page, [
      { id: 'item-1', title: 'First Item', type: 'song', artist: 'Artist 1' },
      { id: 'item-2', title: 'Second Item', type: 'song', artist: 'Artist 2' },
    ]);

    await searchPanel.search('Setup');
    await expect(await searchPanel.getResultCard('item-1')).toBeVisible();
    await expect(await searchPanel.getResultCard('item-2')).toBeVisible();

    await searchPanel.dragToTier('item-1', 'S');
    await expect(page.getByTestId('media-card-item-1')).toBeVisible({ timeout: 15_000 });

    await searchPanel.dragToTier('item-2', 'S');
    await expect(page.getByTestId('media-card-item-2')).toBeVisible({ timeout: 15_000 });
  });

  test('should manage items: details, move, reorder, remove', async ({ page, boardPage }) => {
    // TODO: dnd-kit drag simulations are flaky in headless browsers
    const tierS = page.locator('[data-tier-label="S"]');
    const tierA = page.locator('[data-tier-label="A"]');
    const cards = tierS.getByTestId(/^media-card-item-/);

    // 1. Details
    await mockItemDetails(page, {
      id: 'item-1',
      title: 'First Item',
      type: 'song',
      artist: 'Artist 1',
      description: 'A very detailed description',
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
    await boardPage.reorderItemsViaKeyboard('S', 1, 0);
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
    await mockItemDetails(page, {
      id: 'item-1',
      title: 'First Item',
      type: 'song',
      artist: 'Artist 1',
      description: 'A very detailed description',
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
