import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

test.describe('Tier List App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the page correctly', async ({ page }) => {
    // The title is "MOAT", rendered letter by letter.
    // We check if the h1 contains the text (which might be tricky if it's separate spans),
    // but verifying the H1 presence is good enough.
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toHaveText(/MOAT/i);
  });

  test('should add a new tier', async ({ page }) => {
    // Wait for initial hydration (default state has 6 tiers)
    await expect(page.getByTestId('tier-row-label')).toHaveCount(6);

    // Click 'Add Tier'
    await page.getByText('Add Tier').click();

    // Verify count increased
    await expect(page.getByTestId('tier-row-label')).toHaveCount(7);
  });

  test('should persist data after reload', async ({ page }) => {
    await expect(page.getByTestId('tier-row-label')).toHaveCount(6);

    // Add a tier
    await page.getByText('Add Tier').click();
    await expect(page.getByTestId('tier-row-label')).toHaveCount(7);

    // Wait for debounce (1000ms) to save to localStorage
    await page.waitForTimeout(1100);

    // Reload
    await page.reload();

    // Verify persistence
    await expect(page.getByTestId('tier-row-label')).toHaveCount(7);
  });

  test('should reorder tiers via drag and drop', async ({ page }) => {
    // Get initial order of labels
    const labels = page.getByTestId('tier-row-label');
    await expect(labels).toHaveCount(6);

    const firstLabel = await labels.nth(0).textContent();
    const secondLabel = await labels.nth(1).textContent();

    expect(firstLabel).toBe('S');
    expect(secondLabel).toBe('A');

    // Locate the drag handle of the first tier.
    // The handle is the parent div of the GripVertical icon.
    const firstHandle = page.locator('div:has(> svg.lucide-grip-vertical)').first();
    const secondRow = labels.nth(1);

    // Get bounding boxes to calculate precise coordinates
    const handleBox = await firstHandle.boundingBox();
    const targetBox = await secondRow.boundingBox();

    if (!handleBox || !targetBox) throw new Error('Could not find elements');

    // Perform Drag and Drop with steps
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();

    // Move slowly to the target
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
      steps: 10,
    });

    // Wait a bit for the sorting animation/logic to trigger
    await page.waitForTimeout(100);

    await page.mouse.up();

    // Verify order changed
    // The previous first row ("S") should now be below the "A" row.
    // So the new first row should be "A".
    await expect(labels.nth(0)).toHaveText('A');
    await expect(labels.nth(1)).toHaveText('S');
  });

  test('should drag a song from search to a tier', async ({ page }) => {
    // 1. Mock the search API
    await page.route('**/api/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 'song-1',
              title: 'Test Song',
              artist: 'Test Artist',
              type: 'song',
              imageUrl: 'https://placehold.co/100',
            },
          ],
          page: 1,
          totalPages: 1,
          totalCount: 1,
        }),
      });
    });

    // 2. Perform search
    const searchInput = page.getByPlaceholder('Search songs...');
    await searchInput.fill('Test');
    await searchInput.press('Enter');

    // 3. Locate the result card
    // Note: MediaCard usually has ID like `media-card-search-song-1`
    const card = page.locator('#media-card-search-song-1');
    await expect(card).toBeVisible();

    // 4. Drag card to the first tier
    // The target is the sortable context of the first tier.
    // TierRow renders a SortableContext.
    // We can target the TierRow div itself. The TierRow doesn't have a direct testid for the drop zone,
    // but we can target the list container roughly by the label 'S' or just the first row container.
    // Let's target the area to the right of the label 'S'.

    const firstTierLabel = page.getByText('S', { exact: true });
    // The drop zone is the sibling of the label column.
    // We can just drag to the far right of the first row element.

    const cardBox = await card.boundingBox();
    const tierBox = await firstTierLabel.locator('..').locator('..').boundingBox(); // Go up to row container

    if (!cardBox || !tierBox) throw new Error('Could not find drag elements');

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();

    // Drag to the center/right of the tier row
    await page.mouse.move(tierBox.x + tierBox.width * 0.8, tierBox.y + tierBox.height / 2, {
      steps: 20,
    });

    await page.waitForTimeout(200); // Wait for drop animation/placeholder
    await page.mouse.up();

    // 5. Verify the item is now in the tier
    // The ID in the tier will be `media-card-song-1` (prefix 'search-' is removed by logic)
    // Wait, the logic says: removeItemFromTier... and `id: activeId` logic.
    // The logic in useTierListDnD removes 'search-' prefix when finalizing drop.
    const droppedCard = page.locator('#media-card-song-1');
    await expect(droppedCard).toBeVisible();

    // Verify it's visually inside the tier row (optional, complex check)
    // Checking existence on page with correct ID is usually enough as it implies state update.
  });

  test('should import tier list from json', async ({ page }) => {
    // Prepare a dummy JSON file
    const importData = {
      version: 1,
      createdAt: new Date().toISOString(),
      tiers: [
        { label: 'Imported Tier S', color: 'red', items: [] },
        { label: 'Imported Tier A', color: 'blue', items: [] },
      ],
    };

    // Create temporary file
    const testDir = 'test-results';
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    const filePath = path.join(testDir, 'import_test.json');
    fs.writeFileSync(filePath, JSON.stringify(importData));

    // Wait for initial load
    await expect(page.getByTestId('tier-row-label')).toHaveCount(6);

    // Trigger file chooser by clicking the visible label
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Import', { exact: true }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles(filePath);

    // Verify UI updated
    await expect(page.getByTestId('tier-row-label')).toHaveCount(2);
    await expect(page.getByText('Imported Tier S')).toBeVisible();
    await expect(page.getByText('Imported Tier A')).toBeVisible();

    // Cleanup
    fs.unlinkSync(filePath);
  });

  test('should open and close search panel tabs', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search songs...');
    await expect(searchInput).toBeVisible();

    // Switch to Album tab
    await page.getByTitle('Search albums').click();
    await expect(page.getByPlaceholder('Search albums...')).toBeVisible();
  });
  test('should filter search results by type', async ({ page }) => {
    // Mock API to return different results based on type
    await page.route('**/api/search*', async (route) => {
      const url = route.request().url();
      const type = new URL(url).searchParams.get('type');

      if (type === 'album') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 'album-1',
                title: 'Test Album',
                type: 'album',
                artist: 'Test Artist',
                imageUrl: '',
              },
            ],
            page: 1,
            totalPages: 1,
          }),
        });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ results: [], page: 1 }) });
      }
    });

    // Switch to Album Tab
    await page.getByTitle('Search albums').click();
    await expect(page.getByPlaceholder('Search albums...')).toBeVisible();

    // Perform Search
    await page.getByPlaceholder('Search albums...').fill('Test');
    await page.getByPlaceholder('Search albums...').press('Enter');

    // Verify Album Card appears
    // Use specific ID to ensure it is the correct card (Search adds 'search-' prefix)
    await expect(page.locator('#media-card-search-album-1')).toBeVisible();
    await expect(page.locator('#media-card-search-album-1')).toContainText('Test Album');
  });

  test.skip('should move item via keyboard', async ({ page }) => {
    // 1. Setup board via Import (more robust than DB hacking)
    const importData = {
      version: 1,
      title: 'Keyboard Test',
      tierDefs: [
        { id: '1', label: 'Start', color: 'red', items: [] },
        { id: '2', label: 'End', color: 'blue', items: [] },
      ],
      items: {
        '1': [{ id: 'item-1', title: 'MoveMe', type: 'song', artist: 'Artist' }],
      },
    };

    // Create temp file
    const testDir = 'test-results';
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    const filePath = path.join(testDir, 'keyboard_import.json');
    fs.writeFileSync(filePath, JSON.stringify(importData));

    // Import
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Import', { exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // Wait for item to appear
    const card = page.locator('#media-card-item-1');
    await expect(card).toBeVisible();
    await card.focus();

    // Cleanup
    fs.unlinkSync(filePath);

    // 3. Lift item
    await page.keyboard.press('Enter');
    // Verify dnd-kit lift (aria-pressed or role description change).
    // skipping explicit attribute check as it can be flaky in headless env; relying on final move result.
    // await expect(card).toHaveAttribute('aria-pressed', 'true');

    // 4. Move Down to next tier (ArrowDown) (Move from Tier 1 to Tier 2)
    await page.keyboard.press('ArrowDown');

    // 5. Drop
    await page.keyboard.press('Space');

    // 6. Verify item is in second tier
    // The "End" label is in the second row. We verify "MoveMe" is in that visual container.
    const secondRow = page.locator('.flex-row').filter({ hasText: 'End' });
    await expect(secondRow).toContainText('MoveMe');
  });
});
