import AxeBuilder from '@axe-core/playwright';

import { expect, test } from './fixtures';
import { clearBrowserStorage } from './utils/storage';

test.describe('Accessibility Requirements', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserStorage(page);
  });

  test('default board should not have any automatically detectable accessibility issues', async ({
    page,
    boardPage,
  }) => {
    await boardPage.goto();
    // Use an explicit wait to ensure the board is fully hydrated and rendered
    await expect(page.getByLabel('Tier List Title')).toBeVisible();
    await expect(page.getByTestId('tier-row-label')).toHaveCount(6);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast', 'region', 'page-has-heading-one'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('search panel should not have any automatically detectable accessibility issues', async ({
    page,
    boardPage,
  }) => {
    await boardPage.goto();
    // Wait for the search panel to render
    await expect(page.getByPlaceholder('Search songs...')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('.sticky') // Only check the search panel
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
