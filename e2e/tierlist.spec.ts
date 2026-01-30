import fs from 'node:fs';

import { expect, test } from '@playwright/test';

/**
 * Asserts that a bounding box is not null, narrowing the type for TypeScript.
 * @param box - The bounding box to check.
 */
function assertBoundingBox(
  box: { x: number; y: number; width: number; height: number } | null,
): asserts box is { x: number; y: number; width: number; height: number } {
  expect(box).toBeTruthy();
}

test.describe('Tier List App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the page correctly', async ({ page }) => {
    // The title is "MOAT", rendered letter by letter.
    // We check if the board title input is visible to confirm hydration.
    await expect(page.getByLabel('Tier List Title')).toBeVisible();
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

    // Wait for debounce to save to localStorage.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(2000);

    // Reload
    await page.reload();

    // Verify persistence
    await expect(page.getByTestId('tier-row-label')).toHaveCount(7);
  });

  test('should reorder tiers via drag and drop', async ({ page }) => {
    // Get initial order of labels
    const labels = page.getByTestId('tier-row-label');
    await expect(labels).toHaveCount(6);

    await expect(labels.nth(0)).toHaveText('S');
    await expect(labels.nth(1)).toHaveText('A');

    // Locate the drag handle of the first tier and the second tier label as target
    const firstHandle = page.getByTestId('tier-row-drag-handle').first();
    const secondRowLabel = labels.nth(1);

    // Get bounding boxes
    const handleBox = await firstHandle.boundingBox();
    const targetBox = await secondRowLabel.boundingBox();

    assertBoundingBox(handleBox);
    assertBoundingBox(targetBox);

    // Perform Drag and Drop
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();

    // Move to the second row's label area
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
      steps: 15,
    });
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
    const cardBox = await card.boundingBox();
    assertBoundingBox(cardBox);

    // Target the first tier's drop zone
    const firstTierRow = page.getByTestId('tier-row').filter({ hasText: 'S' });
    const dropZone = firstTierRow.getByTestId('tier-drop-zone');
    const dropBox = await dropZone.boundingBox();
    assertBoundingBox(dropBox);

    // Perform the drag and drop
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();

    // Move to the drop zone with enough steps to trigger dnd-kit detection
    await page.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2, {
      steps: 20,
    });
    await page.mouse.up();

    // 5. Verify the item is now in the tier
    // The ID in the tier will be `media-card-song-1` (prefix 'search-' is removed by logic)
    const droppedCard = page.locator('#media-card-song-1');
    await expect(droppedCard).toBeVisible();

    // Verify it's visually inside the tier row (optional, complex check)
    // Checking existence on page with correct ID is usually enough as it implies state update.
  });

  test('should import tier list from json', async ({ page }, testInfo) => {
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
    const filePath = testInfo.outputPath('import_test.json');
    fs.writeFileSync(filePath, JSON.stringify(importData));

    // Wait for initial load
    await expect(page.getByTestId('tier-row-label')).toHaveCount(6);

    // Trigger file chooser by clicking the visible label
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTitle('Board Options').click();
    await page.getByText('Import JSON', { exact: true }).click();
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

  // Skipped because keyboard drag-and-drop interactions are currently flaky in headless
  // browser environments and require more robust synchronization for dnd-kit.
  test('should move item via keyboard', async ({ page }, testInfo) => {
    // 1. Setup board via Import
    const importData = {
      version: 1,
      title: 'Keyboard Test',
      tiers: [
        {
          label: 'Start',
          color: 'red',
          items: [{ id: 'item-1', title: 'MoveMe', type: 'song', artist: 'Artist' }],
        },
        {
          label: 'End',
          color: 'blue',
          items: [],
        },
      ],
    };

    // Create temp file
    const filePath = testInfo.outputPath('keyboard_import.json');
    fs.writeFileSync(filePath, JSON.stringify(importData));

    // Import
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTitle('Board Options').click();
    await page.getByText('Import JSON', { exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // Wait for item to appear and focus it
    const card = page.locator('#media-card-item-1');
    await expect(card).toBeVisible();
    
    // Cleanup early to avoid interfering with interaction
    fs.unlinkSync(filePath);

    // Focus the card to prepare for keyboard interaction
    await card.focus();
    await expect(card).toBeFocused();

    // 3. Lift item
    await page.keyboard.press('Enter');
    
    // dnd-kit often adds aria-pressed or role description. 
    // We wait a tiny bit for the sensor to activate.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(100);

    // 4. Move Down to next tier (ArrowDown) (Move from Tier 1 to Tier 2)
    await page.keyboard.press('ArrowDown');
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(100);

    // 5. Drop
    await page.keyboard.press(' '); // Space to drop
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(100);

    // 6. Verify item is in second tier
    const secondRow = page.getByTestId('tier-row').filter({ hasText: 'End' });
    await expect(secondRow).toContainText('MoveMe');
  });
});
