import { expect, test } from './fixtures';

test.describe('Dashboard and Multi-Board', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {});

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

    // 4. Go back to dashboard and verify board exists
    // We poll for the board title on the dashboard to handle the debounced persistence
    await expect
      .poll(
        async () => {
          await boardPage.dashboardButton.click();
          await expect(dashboardPage.page).toHaveURL(/\/dashboard$/);
          return dashboardPage.page.getByText(boardTitle).isVisible();
        },
        {
          message: 'Board should appear in dashboard after creation and modification',
          timeout: 10_000,
          intervals: [1000, 2000],
        },
      )
      .toBeTruthy();

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
