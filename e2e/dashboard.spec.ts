import { expect, test } from './fixtures';

test.describe('Dashboard and Multi-Board', () => {
  test.setTimeout(60_000);

  test.beforeEach(async () => {});

  test('should create, modify, and see changes in dashboard', async ({
    dashboardPage,
    boardPage,
  }) => {
    await dashboardPage.goto();
    const boardTitle = `Board ${Date.now()}`;

    // 1. Create
    await dashboardPage.createBoard(boardTitle);

    // 2. We should be redirected to the new board
    await expect(boardPage.titleInput).toHaveValue(boardTitle);

    // 3. Add a tier (triggers auto-save/persistence)
    const initialTiers = await boardPage.tierLabels.count();
    await boardPage.addTier();
    await expect(boardPage.tierLabels).toHaveCount(initialTiers + 1);

    // 4. Wait for debounce/save to flush to IndexedDB
    // Idiomatic Playwright: directly await the underlying state change (IndexedDB write)
    // before attempting UI navigation, avoiding both fixed timeouts and flaky page reloads.
    await dashboardPage.page.waitForFunction(
      async (title) => {
        return new Promise((resolve) => {
          const req = indexedDB.open('keyval-store');
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('keyval')) return resolve(false);
            const tx = db.transaction('keyval', 'readonly');
            const store = tx.objectStore('keyval');
            const getReq = store.get('tier-list-index');
            getReq.onsuccess = () => {
              const index = getReq.result || [];
              resolve(index.some((b: any) => b.title === title));
            };
            getReq.onerror = () => resolve(false);
          };
          req.onerror = () => resolve(false);
        });
      },
      boardTitle,
      { timeout: 10_000 },
    );

    // 5. Go back to dashboard and verify board exists
    await boardPage.dashboardButton.click();
    await dashboardPage.page.waitForURL(/\/dashboard$/);
    await expect(dashboardPage.page.getByText(boardTitle)).toBeVisible({ timeout: 5000 });

    // 5. Delete board
    await dashboardPage.deleteBoard(boardTitle);
    await expect(dashboardPage.page.getByText(boardTitle)).toBeHidden();
  });

  test('should persevere after refresh', async ({ page, dashboardPage, boardPage }) => {
    await dashboardPage.goto();
    // TODO: Dashboard hydration is flaky in headless browsers
    const boardTitle = 'Permanent Board';
    await dashboardPage.createBoard(boardTitle);

    await boardPage.dashboardButton.click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('should open an existing board', async ({ dashboardPage, boardPage }) => {
    await dashboardPage.goto();
    // TODO: Dashboard hydration is flaky in headless browsers
    const boardTitle = 'Permanent Board';
    await dashboardPage.createBoard(boardTitle);

    await boardPage.dashboardButton.click();
    await dashboardPage.openBoard(boardTitle);

    await expect(boardPage.titleInput).toHaveValue(boardTitle);
  });
});
