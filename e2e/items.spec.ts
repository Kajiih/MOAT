import { expect, test } from './fixtures';
import { mockItemDetails, mockSearchResults } from './utils/mocks';

test.describe('Item Management', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page, dashboardPage, searchPanel, boardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.createBoard('Item Management Test');

    // Setup: Add two items to tier S
    await mockSearchResults(page, [
      { id: 'item-1', title: 'First Item', type: 'game', developer: 'Artist 1' },
      { id: 'item-2', title: 'Second Item', type: 'game', developer: 'Artist 2' },
    ]);

    await searchPanel.search('Setup');
    await expect(await searchPanel.getResultCard('item-1')).toBeVisible();
    await expect(await searchPanel.getResultCard('item-2')).toBeVisible();

    await searchPanel.dragToTier('item-1', 'S');
    await expect(boardPage.getItemCard('item-1')).toBeVisible({ timeout: 15_000 });

    await searchPanel.dragToTier('item-2', 'S');
    await expect(boardPage.getItemCard('item-2')).toBeVisible({ timeout: 15_000 });
  });

  test('should manage items: details, move, reorder, remove', async ({ page, boardPage }) => {

    const tierS = page.locator('[data-tier-label="S"]');
    const cards = tierS.getByTestId(/^item-card-/);

    // 1. Details
    await mockItemDetails(page, {
      id: 'item-1',
      title: 'First Item',
      type: 'game',
      developer: 'Artist 1',
      description: 'A very detailed description',
    });

    const card1 = boardPage.getItemCard('item-1');
    await expect(card1).toBeVisible({ timeout: 15_000 });

    // Open details via button (more reliable than shortcut in tests)
    await card1.hover();
    await card1.getByRole('button', { name: /Details/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('First Item');
    await expect(dialog).toContainText('Artist 1');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // 2. Reorder in S
    await expect(cards).toHaveCount(2);

    // Semantically move item-2 before item-1
    await boardPage.moveItemBeforeItem('item-2', 'item-1');
    await expect(cards.nth(0)).toContainText('Second Item');

    // Shift it right again
    await boardPage.shiftItemRight('item-2');
    await expect(cards.nth(1)).toContainText('Second Item');

    // 3. Move from S to A using edge semantics
    await boardPage.moveItemToStartOfTier('item-1', 'A');
    await boardPage.expectItemInTier('item-1', 'A');
    await boardPage.expectItemNotInTier('item-1', 'S');

    // 4. Semantically Remove
    await boardPage.deleteItem('item-1');
    await boardPage.expectItemNotInTier('item-1', 'A');
  });

  test('should handle personal notes', async ({ page, boardPage }) => {
    const card1 = boardPage.getItemCard('item-1');
    await expect(card1).toBeVisible({ timeout: 15_000 });

    // Route API before opening the modal
    await mockItemDetails(page, {
      id: 'item-1',
      title: 'First Item',
      type: 'game',
      developer: 'Artist 1',
      description: 'A very detailed description',
    });

    // Open details via button (more reliable than shortcut in tests)
    await card1.hover();
    await card1.getByRole('button', { name: /Details/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Type a note
    const notesEditor = page.getByPlaceholder(/write your thoughts/i);
    await expect(notesEditor).toBeVisible();
    await notesEditor.fill('This is a test note for item 1');

    // Close modal — the unmount flush handler persists the note immediately
    await page.keyboard.press('Escape');
    // Ensure dialog fully leaves the DOM before checking notes indicator
    await expect(page.locator('dialog')).toBeHidden({ timeout: 10_000 });

    // The notes indicator badge should now be visible on the card
    await expect(card1.getByTestId('notes-indicator').first()).toBeVisible({ timeout: 10_000 });
  });
  test('should move and reorder items via Keyboard', async ({ page, boardPage }) => {
    // Both items are in Tier S.
    // [ First Item (item-1) ] [ Second Item (item-2) ]
    const tierS = page.locator('[data-tier-label="S"]');
    const cards = tierS.getByTestId(/^item-card-/);

    // Initial state check
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText('First Item');
    await expect(cards.nth(1)).toContainText('Second Item');

    // 1. Focus on the second item
    const item2 = boardPage.getItemCard('item-2');
    await item2.focus();
    
    // 2. Lift the item using Space
    await page.keyboard.press('Space');
    // Give state a moment to update the opacity/aria-selected
    await page.waitForTimeout(100);
    await expect(item2).toHaveAttribute('aria-selected', 'true');

    // 3. Move it left using ArrowLeft (before item-1)
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200); // Allow Redux processing

    // Expect order to have swapped
    await expect(cards.nth(0)).toContainText('Second Item');
    await expect(cards.nth(1)).toContainText('First Item');

    // 4. Drop the item using Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    
    // Verify changes persisted via UI
    await expect(item2).toHaveAttribute('aria-selected', 'false');
    await expect(cards.nth(0)).toContainText('Second Item');
  });

  test('should move items vertically between tiers via Keyboard', async ({ page, boardPage }) => {
    // Both items are in Tier S.
    const tierS = page.locator('[data-tier-label="S"]');
    const tierA = page.locator('[data-tier-label="A"]');
    
    // 1. Focus on item-1
    const item1 = boardPage.getItemCard('item-1');
    await item1.focus();
    
    // 2. Lift the item using Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    await expect(item1).toHaveAttribute('aria-selected', 'true');

    // 3. Move it down securely using ArrowDown (should go from S to A)
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // 4. Drop the item using Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    // Verify it moved to Tier A
    await boardPage.expectItemInTier('item-1', 'A');
    await expect(item1).toHaveAttribute('aria-selected', 'false');

    // 5. Move it back up using ArrowUp (should go from A to S)
    await item1.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    // Verify it moved back to Tier S
    await boardPage.expectItemInTier('item-1', 'S');
  });

  test('should move item 2 tiers down continuously without pressing space', async ({ page, boardPage }) => {
    // 1. Focus on item-1
    const item1 = boardPage.getItemCard('item-1');
    await item1.focus();

    // 2. Lift the item using Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    await expect(item1).toHaveAttribute('aria-selected', 'true');

    // 3. Move it down two tiers continuously using ArrowDown (S -> A -> B)
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    // 4. Drop the item using Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    // Verify it moved to Tier B
    await boardPage.expectItemInTier('item-1', 'B');
    await expect(item1).toHaveAttribute('aria-selected', 'false');
  });
});

