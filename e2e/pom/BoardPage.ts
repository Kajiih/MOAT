import { expect, type Locator, type Page } from '@playwright/test';

export class BoardPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly addTierButton: Locator;
  readonly optionsButton: Locator;
  readonly importJsonButton: Locator;
  readonly exportJsonButton: Locator;
  readonly clearBoardButton: Locator;
  readonly shareButton: Locator;
  readonly cameraButton: Locator;
  readonly dashboardButton: Locator;
  readonly tierRows: Locator;
  readonly tierLabels: Locator;
  readonly tierDragHandles: Locator;
  readonly tierColorDots: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByLabel('Tier List Title');
    this.addTierButton = page.getByText('Add Tier');
    this.optionsButton = page.getByTitle('Board Options');
    this.importJsonButton = page.getByText('Import JSON');
    this.exportJsonButton = page.getByRole('button', { name: /Export JSON/i });
    this.clearBoardButton = page.getByRole('button', { name: /Clear Board/i });
    this.shareButton = page.getByTitle('Publish to Cloud');
    this.cameraButton = page.getByTitle('Save as Image');
    this.dashboardButton = page.getByTitle('Back to Dashboard');
    this.tierRows = page.getByTestId('tier-row');
    this.tierLabels = page.getByTestId('tier-row-label');
    this.tierDragHandles = page.getByTestId('tier-row-drag-handle');
    this.tierColorDots = page.getByTestId('tier-color-dot');
  }

  async goto(id?: string) {
    if (id) {
      await this.page.goto(`/board/${id}`);
    } else {
      await this.page.goto('/');
    }
    await expect(this.titleInput).toBeVisible();
  }

  async setBoardTitle(title: string) {
    await this.titleInput.fill(title);
    await this.titleInput.press('Enter');
  }

  async addTier() {
    await this.addTierButton.click({ delay: 100 });
  }

  async openOptions() {
    // Check if menu is already open by checking visibility of a menu item
    if (await this.clearBoardButton.isVisible()) {
      return;
    }
    await this.optionsButton.hover();
    await this.optionsButton.click({ delay: 50 });
    // Small wait for transition
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(200);
  }

  async importJson(filePath: string) {
    await this.openOptions();
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    // eslint-disable-next-line playwright/no-force-option
    await this.importJsonButton.click({ force: true });
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  }

  async exportJson() {
    await this.openOptions();
    const downloadPromise = this.page.waitForEvent('download');
    // eslint-disable-next-line playwright/no-force-option
    await this.exportJsonButton.click({ force: true });
    return downloadPromise;
  }

  async clearBoard() {
    await this.openOptions();
    // Wait for the menu item to be stably attached and visible
    await this.clearBoardButton.waitFor({ state: 'visible', timeout: 5000 });
    // eslint-disable-next-line playwright/no-force-option
    await this.clearBoardButton.click({ delay: 50, force: true });
    // Verify it closed
    await expect(this.clearBoardButton).not.toBeVisible();
  }

  async getTierRow(label: string) {
    return this.page.locator(`[data-tier-label="${label}"]`);
  }

  async renameTier(oldLabel: string, newLabel: string) {
    const row = await this.getTierRow(oldLabel);
    await row.waitFor({ state: 'visible', timeout: 10000 });
    
    const label = row.getByTestId('tier-row-label');
    const input = row.getByLabel('Tier label');
    
    // Ensure element is ready
    await label.scrollIntoViewIfNeeded();
    await label.hover();
    
    try {
      await label.dblclick({ delay: 200, force: true });
      await input.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      // Fallback: click then double click
      await label.click();
      await this.page.waitForTimeout(100);
      await label.dblclick({ delay: 200, force: true });
      await input.waitFor({ state: 'visible', timeout: 5000 });
    }
    
    await input.fill(newLabel);
    await input.press('Enter');
  }

  async deleteTier(label: string) {
    const row = await this.getTierRow(label);
    await row.getByTitle('Tier Settings').click({ delay: 100 });
    this.page.once('dialog', dialog => dialog.accept());
    await this.page.getByRole('button', { name: /Delete Tier/i }).click({ delay: 100 });
  }

  async changeTierColor(label: string) {
    const row = await this.getTierRow(label);
    await row.getByTitle('Tier Settings').click({ delay: 100 });
    await this.page.getByTitle('Blue').click({ delay: 100 });
    await this.page.keyboard.press('Escape');
  }

  async reorderTiers(sourceIndex: number, targetIndex: number) {
    const sourceRow = this.tierRows.nth(sourceIndex);
    const sourceHandle = this.tierDragHandles.nth(sourceIndex);
    const targetRow = this.tierRows.nth(targetIndex);

    // Ensure source is ready
    await sourceRow.hover();
    await sourceHandle.hover({ force: true });
    
    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetRow.boundingBox();

    if (!sourceBox || !targetBox) return;

    // Manual drag sequence optimized for dnd-kit
    await this.page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await this.page.mouse.down();
    
    // Hold to ensure drag start is registered
    await this.page.waitForTimeout(200);
    
    // Initial small move to trigger sensor
    await this.page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2 + 10, { steps: 5 });
    await this.page.waitForTimeout(100);

    // Move to target
    await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 50 });
    
    // Hover over target for a bit
    await this.page.waitForTimeout(200);
    
    // Small wiglle on target
    await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2 + 5, { steps: 5 });
    await this.page.waitForTimeout(100);

    await this.page.mouse.up();
    
    // Wait for animation/reorder to settle
    await this.page.waitForTimeout(500);
  }
}
