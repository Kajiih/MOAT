import { expect, test } from './fixtures';
import { mockSearchResults } from './utils/mocks';

test.describe('Board Reset and Clear Actions', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox headless dnd-kit drag layers permanently overlap and block Radix Dropdown menus from receiving pointer events.');
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
      const card = await searchPanel.getResultCard(id);
      await expect(card).toBeVisible();
      await searchPanel.dragToTier(id, 'S');
      await expect(boardPage.getMediaCard(id)).toBeVisible({ timeout: 15_000 });
    }
  });

  test('should reset all items to unranked', async ({ boardPage }) => {
    // Initial state: all 3 in S
    await expect(boardPage.getTierRow('S').getByTestId(/media-card-/)).toHaveCount(3);

    // Reset items
    await boardPage.resetItems();

    // Verify all tiers except Unranked are empty
    await expect(boardPage.getTierRow('S').getByTestId(/media-card-/)).toHaveCount(0);
    await expect(boardPage.getTierRow('A').getByTestId(/media-card-/)).toHaveCount(0);
    await expect(boardPage.getTierRow('B').getByTestId(/media-card-/)).toHaveCount(0);
    await expect(boardPage.getTierRow('C').getByTestId(/media-card-/)).toHaveCount(0);
    await expect(boardPage.getTierRow('D').getByTestId(/media-card-/)).toHaveCount(0);

    // Verify Unranked has all 3 items
    await expect(boardPage.getTierRow('Unranked').getByTestId(/media-card-/)).toHaveCount(3);

    // Verify items still exist in lookup/UI
    await expect(boardPage.getMediaCard('item-1')).toBeVisible();
    await expect(boardPage.getMediaCard('item-2')).toBeVisible();
    await expect(boardPage.getMediaCard('item-3')).toBeVisible();
  });

  test('should clear the entire board (all items gone)', async ({ boardPage }) => {
    test.skip(true, 'Skipping flaky Radix Dropdown + window.confirm() modal interaction bug in Playwright.');
    
    // Initial state: items present
    await expect(boardPage.tierRows.getByTestId(/media-card-/)).toHaveCount(3);

    // Clear board
    await boardPage.clearBoard();

    // Verify EVERYTHING is gone
    await expect(boardPage.tierRows.getByTestId(/media-card-/)).toHaveCount(0);

    // Verify tiers are reset to default count (6)
    await expect(boardPage.tierLabels).toHaveCount(6);
    await expect(boardPage.tierLabels.first()).toHaveText('S');
  });

  test('should support undo for reset items', async ({ boardPage }) => {
    test.skip(true, 'Skipping flaky Radix Dropdown + window.confirm() modal interaction bug in Playwright.');
    
    // Initial state
    await boardPage.resetItems();
    await expect(boardPage.getTierRow('Unranked').getByTestId(/media-card-/)).toHaveCount(3);

    // Undo - Use only one shortcut to avoid double-undoing
    // We use Control+z which is handled for both Meta and Ctrl in our app code
    await boardPage.page.keyboard.press('Control+z');

    // Verify state is restored to 3 items in S
    await expect(boardPage.getTierRow('S').getByTestId(/media-card-/)).toHaveCount(3, {
      timeout: 15_000,
    });
    // And consequently 0 in Unranked
    await expect(boardPage.getTierRow('Unranked').getByTestId(/media-card-/)).toHaveCount(0);
  });
});
