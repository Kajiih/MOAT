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
    await expect(item2).toHaveAttribute('aria-selected', 'true');

    // 3. Move it left using ArrowLeft (before item-1)
    await page.keyboard.press('ArrowLeft');

    // Expect order to have swapped
    await expect(cards.nth(0)).toContainText('Second Item');
    await expect(cards.nth(1)).toContainText('First Item');
    await expect(item2).toBeFocused();

    // 4. Drop the item using Space
    await page.keyboard.press('Space');

    // Verify changes persisted via UI
    await expect(item2).toHaveAttribute('aria-selected', 'false');
    await expect(cards.nth(0)).toContainText('Second Item');
  });

  test('should move items vertically between tiers via Keyboard', async ({ page, boardPage }) => {
    // Both items are in Tier S.

    // 1. Focus on item-1
    const item1 = boardPage.getItemCard('item-1');
    await item1.focus();

    // 2. Lift the item using Space
    await page.keyboard.press('Space');
    await expect(item1).toHaveAttribute('aria-selected', 'true');

    // 3. Move it down securely using ArrowDown (should go from S to A)
    await page.keyboard.press('ArrowDown');
    await boardPage.expectItemInTier('item-1', 'A');
    await expect(boardPage.getItemCard('item-1', 'A')).toBeFocused();

    // 4. Drop the item using Space
    await page.keyboard.press('Space');
    await expect(boardPage.getItemCard('item-1', 'A')).toHaveAttribute('aria-selected', 'false');

    // Verify it remains in Tier A
    await boardPage.expectItemInTier('item-1', 'A');

    // 5. Move it back up using ArrowUp (should go from A to S)
    await boardPage.getItemCard('item-1', 'A').focus();
    await page.keyboard.press('Space');
    await expect(boardPage.getItemCard('item-1', 'A')).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowUp');
    await boardPage.expectItemInTier('item-1', 'S');
    await expect(boardPage.getItemCard('item-1', 'S')).toBeFocused();

    await page.keyboard.press('Space');
    await expect(boardPage.getItemCard('item-1', 'S')).toHaveAttribute('aria-selected', 'false');

    // Verify it moved back to Tier S
    await boardPage.expectItemInTier('item-1', 'S');
  });

  test('should move item 2 tiers down continuously without pressing space', async ({
    page,
    boardPage,
  }) => {
    // 1. Focus on item-1
    const item1 = boardPage.getItemCard('item-1');
    await item1.focus();

    // 2. Lift the item using Space
    await page.keyboard.press('Space');
    await expect(item1).toHaveAttribute('aria-selected', 'true');

    // 3. Move it down two tiers continuously using ArrowDown (S -> A -> B)
    await page.keyboard.press('ArrowDown');
    await boardPage.expectItemInTier('item-1', 'A');
    await expect(boardPage.getItemCard('item-1', 'A')).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await boardPage.expectItemInTier('item-1', 'B');
    await expect(boardPage.getItemCard('item-1', 'B')).toBeFocused();

    // 4. Drop the item using Space
    await page.keyboard.press('Space');
    await expect(boardPage.getItemCard('item-1', 'B')).toHaveAttribute('aria-selected', 'false');

    // Verify it moved to Tier B
    await boardPage.expectItemInTier('item-1', 'B');
  });

  test.fail(
    'should support contiguous tab navigation between tiers and items',
    async ({ page, boardPage }) => {
      // We intentionally expect this to "fail" the contiguity assertion because
      // we decided to preserve the native DOM hierarchy for Web Accessibility (WCAG).
      // Tab flow organically moves Tier Handle -> Tier Items -> Next Tier Handle.
      // Forcing synthetic contiguity broke screen-reader contextual grouping.

      // 1. Setup - move item 2 to Tier A
      await boardPage.moveItemToStartOfTier('item-2', 'A');

      const item1 = boardPage.getItemCard('item-1');
      const item2 = boardPage.getItemCard('item-2');
      // The handle is rendered as data-testid="tier-row-drag-handle" inside the tier-row
      const rowS = page.locator('[data-testid="tier-row"][data-tier-label="S"]');
      const rowA = page.locator('[data-testid="tier-row"][data-tier-label="A"]');
      const handleS = rowS.getByTestId('tier-row-drag-handle');
      const handleA = rowA.getByTestId('tier-row-drag-handle');

      // Start focus on Tier S Handle
      await rowS.hover();
      await handleS.focus();
      await expect(handleS).toBeFocused();

      // Tab -> Should natively hit item-1 (inside Tier S) next, not Tier A Handle
      await page.keyboard.press('Tab');
      await expect(item1).toBeFocused();

      // Tab -> Should natively hit Tier A Handle next
      await page.keyboard.press('Tab');
      await expect(handleA).toBeFocused();

      // Tab -> Should natively hit item-2 (inside Tier A) next
      await page.keyboard.press('Tab');
      await expect(item2).toBeFocused();
    },
  );

  test('should navigate to linked entities from subtitle accurately', async ({
    page,
    boardPage,
  }) => {
    const card1 = boardPage.getItemCard('item-1');
    await expect(card1).toBeVisible({ timeout: 15_000 });

    const detailsMap = new Map<string, Record<string, unknown>>([
      [
        'rawg:game:item-1',
        {
          id: 'rawg:game:item-1',
          identity: { providerItemId: 'item-1', providerId: 'rawg', entityId: 'game' },
          title: 'First Item',
          subtitle: [
            {
              label: 'Developer',
              name: 'Original Developer',
              identity: { providerItemId: 'item-dev', providerId: 'rawg', entityId: 'developer' },
            },
          ],
          description: 'Details for Item 1',
        },
      ],
      [
        'rawg:developer:item-dev',
        {
          id: 'rawg:developer:item-dev',
          identity: { providerItemId: 'item-dev', providerId: 'rawg', entityId: 'developer' },
          title: 'Original Developer',
          subtitle: 'Top Tier Developer',
          description: 'Details for Developer describing its full bio',
        },
      ],
    ]);

    await page.route('**/api/details*', async (route) => {
      const url = new URL(route.request().url());
      const providerId = url.searchParams.get('providerId');
      const entityId = url.searchParams.get('entityId');
      const providerItemId = url.searchParams.get('providerItemId');
      const key = `${providerId}:${entityId}:${providerItemId}`;
      const payload = detailsMap.get(key);
      if (payload) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });
      } else {
        await route.fulfill({ status: 404 });
      }
    });

    // Open first details
    await card1.hover();
    await card1.getByRole('button', { name: /Details/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('First Item');

    // Click link
    const link = dialog.getByRole('button', { name: 'Original Developer' });
    await expect(link).toBeVisible();
    await link.click();

    // Verify next Details populate accurately
    await expect(dialog).toContainText('Details for Developer describing its full bio');
  });
});
