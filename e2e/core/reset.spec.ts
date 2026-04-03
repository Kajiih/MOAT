import { expect, test } from '../fixtures';
import { mockSearchResults } from '../utils/mocks';

test.describe('Board Reset and Clear Actions', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page, dashboardPage, searchPanel, boardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.createBoard('Reset Action Test');

    // Add multiple items to different tiers
    await mockSearchResults(page, [
      { id: 'item-1', title: 'Item 1', type: 'song' },
      { id: 'item-2', title: 'Item 2', type: 'song' },
      { id: 'item-3', title: 'Item 3', type: 'song' },
    ]);

    await searchPanel.search('Setup');

    // Drag multiple items to Tier S - this is more stable for setup
    const items = ['item-1', 'item-2', 'item-3'];
    for (const id of items) {
      await searchPanel.search('Setup');

      const card = await searchPanel.getResultCard(id);

      await expect(card).toBeVisible({ timeout: 5000 });

      await searchPanel.dragToTier(id, 'S');
      await expect(boardPage.getItemCard(id)).toBeVisible({ timeout: 15_000 });
      // Settle animation before next drag
      await expect(card).not.toHaveClass(/is-dragging/, { timeout: 10_000 });
    }

    // Wait for full board layout hydration
    await boardPage.expectTierToHaveItemCount('S', 3, { timeout: 15_000 });
  });

  test('should reset all items to unranked', async ({ boardPage }) => {
    // Initial state: all 3 in S
    await boardPage.expectTierToHaveItemCount('S', 3);

    // Reset items
    await boardPage.resetItems();

    // Verify all tiers except Unranked are empty
    await boardPage.expectTierToHaveItemCount('S', 0);
    await boardPage.expectTierToHaveItemCount('A', 0);
    await boardPage.expectTierToHaveItemCount('B', 0);
    await boardPage.expectTierToHaveItemCount('C', 0);
    await boardPage.expectTierToHaveItemCount('D', 0);

    // Verify Unranked has all 3 items
    await boardPage.expectTierToHaveItemCount('Unranked', 3);

    // Verify items still exist in lookup/UI
    await expect(boardPage.getItemCard('item-1')).toBeVisible();
    await expect(boardPage.getItemCard('item-2')).toBeVisible();
    await expect(boardPage.getItemCard('item-3')).toBeVisible();
  });

  test('should clear the entire board (all items gone)', async ({ boardPage }) => {
    // Initial state: items present
    await boardPage.expectTierToHaveItemCount('S', 3);

    // Clear board
    await boardPage.clearBoard();

    // Verify EVERYTHING is gone
    await boardPage.expectTierToHaveItemCount('S', 0); // and all other tiers should be 0

    // Verify tiers are reset to default count (6)
    await boardPage.expectTierCount(6);
    await expect(boardPage.tierLabels.first()).toHaveText('S');
  });

  // eslint-disable-next-line playwright/expect-expect
  test('should support undo for reset items', async ({ boardPage }) => {
    // Initial state
    await boardPage.resetItems();
    await boardPage.expectTierToHaveItemCount('Unranked', 3);

    // Undo - Use only one shortcut to avoid double-undoing
    // We use Control+z which is handled for both Meta and Ctrl in our app code
    await boardPage.page.keyboard.press('Control+z');

    // Verify state is restored to 3 items in S
    await boardPage.expectTierToHaveItemCount('S', 3, { timeout: 15_000 });
    // And consequently 0 in Unranked
    await boardPage.expectTierToHaveItemCount('Unranked', 0);
  });
});
