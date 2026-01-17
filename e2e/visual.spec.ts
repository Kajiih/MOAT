import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Reset storage to ensure clean state
    await page.addInitScript(() => {
      const dbs = window.indexedDB.databases();
      dbs.then((databases) => {
        databases.forEach((db) => {
          if (db.name) window.indexedDB.deleteDatabase(db.name);
        });
      });
      localStorage.clear();
    });
    await page.goto('/');
    // Wait for hydration
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByTestId('tier-row-label')).toHaveCount(6);
  });

  test('default board snapshot', async ({ page }) => {
    // Take snapshot of the entire page
    await expect(page).toHaveScreenshot('default-board.png', {
      fullPage: true,
      mask: [page.locator('.lucide-camera')], // Mask dynamic elements if any (camera icon itself is stable though)
    });
  });

  test('search panel snapshot', async ({ page }) => {
    // Open search panel by ensuring it's visible (it is persistent on desktop)
    await expect(page.getByPlaceholder('Search songs...')).toBeVisible();

    // Snapshot of the search panel only
    const searchPanel = page.locator('.sticky'); // The search panel container
    await expect(searchPanel).toHaveScreenshot('search-panel-empty.png');
  });

  test('populated board snapshot', async ({ page }) => {
    // Prepare a dummy JSON file to populate board
    const importData = {
      version: 1,
      title: 'Visual Test Board',
      tiers: [
        { id: '1', label: 'Visual S', color: 'red', items: [] },
        { id: '2', label: 'Visual A', color: 'blue', items: [] },
      ],
      items: {},
    };

    // Create temporary file
    const testDir = 'test-results';
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
    const filePath = path.join(testDir, 'visual_import.json');
    fs.writeFileSync(filePath, JSON.stringify(importData));

    // Import
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Import', { exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // Wait for update
    await expect(page.getByText('Visual S')).toBeVisible();

    // Snapshot
    await expect(page).toHaveScreenshot('populated-board.png', { fullPage: true });

    // Cleanup
    fs.unlinkSync(filePath);
  });
});
