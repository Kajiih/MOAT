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
    // Idempotent: if the menu is already open, don't toggle it off.
    if (await this.clearBoardButton.isVisible()) return;

    await this.optionsButton.hover();
    await this.optionsButton.click({ delay: 50 });
    await this.clearBoardButton.waitFor({ state: 'visible' });
  }

  async importJson(filePath: string) {
    await this.openOptions();
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.importJsonButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  }

  async exportJson() {
    await this.openOptions();
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportJsonButton.click();
    return downloadPromise;
  }

  async clearBoard() {
    await this.openOptions();
    await this.clearBoardButton.click({ delay: 50 });
    await expect(this.clearBoardButton).toBeHidden();
  }

  getTierRow(label: string) {
    return this.page.locator(`[data-tier-label="${label}"]`);
  }
  
  getMediaCard(id: string) {
    return this.page.getByTestId(`media-card-${id}`);
  }

  async renameTier(oldLabel: string, newLabel: string) {
    const row = this.getTierRow(oldLabel);
    await row.waitFor({ state: 'visible' });

    const label = row.getByTestId('tier-row-label');
    const input = row.getByLabel('Tier label');

    await label.scrollIntoViewIfNeeded();
    await label.hover();
    await label.dblclick({ delay: 200 });
    await input.waitFor({ state: 'visible' });

    await input.fill(newLabel);
    await input.press('Enter');
  }

  async deleteTier(label: string) {
    const row = this.getTierRow(label);
    await row.getByTitle('Tier Settings').click({ delay: 100 });
    this.page.once('dialog', dialog => dialog.accept());
    await this.page.getByRole('button', { name: /Delete Tier/i }).click({ delay: 100 });
  }

  async changeTierColor(label: string) {
    const row = this.getTierRow(label);
    await row.getByTitle('Tier Settings').click({ delay: 100 });
    await this.page.getByTitle('Blue').click({ delay: 100 });
    await this.page.keyboard.press('Escape');
  }

  /**
   * Performs a manual drag-and-drop reorder of tier rows.
   * Uses raw mouse events because dnd-kit's PointerSensor requires
   * specific hold/move sequences that Playwright's dragTo() cannot replicate.
   * The waitForTimeout calls are protocol-level pauses for sensor activation
   * — there is no DOM state or event to wait on.
   */
  /* eslint-disable playwright/no-wait-for-timeout */
  async reorderTiers(sourceIndex: number, targetIndex: number) {
    const sourceHandle = this.tierDragHandles.nth(sourceIndex);
    const targetRow = this.tierRows.nth(targetIndex);

    // hover() auto-waits for visibility — no need for explicit expect
    await sourceHandle.hover();

    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetRow.boundingBox();
    if (!sourceBox || !targetBox) {
      throw new Error(`Cannot reorder: bounding box missing for source (index ${sourceIndex}) or target (index ${targetIndex})`);
    }

    // Manual drag sequence optimized for dnd-kit
    await this.page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await this.page.mouse.down();

    // Hold for sensor activation
    await this.page.waitForTimeout(200);

    // Small move to trigger drag start
    await this.page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2 + 10, { steps: 5 });
    await this.page.waitForTimeout(100);

    // Move to target
    await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 50 });
    await this.page.waitForTimeout(200);

    // Small wiggle on target to confirm position
    await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2 + 5, { steps: 5 });
    await this.page.waitForTimeout(100);

    await this.page.mouse.up();

    // Wait for animation/reorder to settle
    await this.page.waitForTimeout(500);
  }
  /* eslint-enable playwright/no-wait-for-timeout */
}
