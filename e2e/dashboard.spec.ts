import { expect, test } from '@playwright/test';

import { BoardPage } from './pom/BoardPage';
import { DashboardPage } from './pom/DashboardPage';

test.describe('Dashboard and Multi-Board', () => {
  test.setTimeout(60_000);
  let dashboardPage: DashboardPage;
  let boardPage: BoardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    boardPage = new BoardPage(page);
    // Ensure we start at dashboard and it's clean (or at least predictable)
    await dashboardPage.goto();
  });

  test('should create, modify, and see changes in dashboard', async ({ page }) => {
    // TODO: Dashboard hydration is flaky in headless browsers
    const boardTitle = `Board ${Date.now()}`;
    
    // 1. Create
    await dashboardPage.createBoard(boardTitle);
    
    // 2. We should be redirected to the new board
    await expect(boardPage.titleInput).toHaveValue(boardTitle);
    
    // 3. Add a tier and wait for persistence
    await boardPage.addTier();
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1500);

    // 4. Go back to dashboard
    await boardPage.dashboardButton.click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // 5. Verify board exists in dashboard
    await expect(page.getByText(boardTitle)).toBeVisible();
    
    // 6. Delete board
    await dashboardPage.deleteBoard(boardTitle);
    await expect(page.getByText(boardTitle)).toBeHidden();
  });

  test('should open an existing board', async ({ page }) => {
    // TODO: Dashboard hydration is flaky in headless browsers
    const boardTitle = 'Permanent Board';
    await dashboardPage.createBoard(boardTitle);
    
    await boardPage.dashboardButton.click();
    await dashboardPage.openBoard(boardTitle);
    
    await expect(boardPage.titleInput).toHaveValue(boardTitle);
  });
});
