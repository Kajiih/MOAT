import { expect, type Locator, type Page } from '@playwright/test';

import { manualDragAndDrop } from '../utils/mouse';

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

  /**
   * Initializes the BoardPage POM.
   * @param page - The Playwright Page object.
   */
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

  /**
   * Gets all tier labels currently on the board.
   * @returns Array of tier label texts.
   */
  async getTierLabels(): Promise<string[]> {
    return this.tierLabels.allTextContents();
  }

  /**
   * Navigates to a specific board or the root page.
   * @param id - Optional board UUID.
   */
  async goto(id?: string) {
    if (id) {
      await this.page.goto(`/board/${id}`);
    } else {
      await this.page.goto('/');
    }
    await expect(this.titleInput).toBeVisible();
  }

  /**
   * Sets the board title.
   * @param title - The new title.
   */
  async setBoardTitle(title: string) {
    await this.titleInput.fill(title);
    await this.titleInput.press('Enter');
  }

  /**
   * Adds a new tier to the board.
   */
  async addTier() {
    await this.addTierButton.click({ delay: 100 });
  }

  /**
   * Opens the board options menu.
   */
  async openOptions() {
    // Idempotent: if the menu is already open, don't toggle it off.
    if (await this.clearBoardButton.isVisible()) return;

    await this.optionsButton.hover();
    await this.optionsButton.click({ delay: 50 });
    await this.clearBoardButton.waitFor({ state: 'visible' });
  }

  /**
   * Imports a board from a JSON file.
   * @param filePath - Path to the JSON file.
   */
  async importJson(filePath: string) {
    await this.openOptions();
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.importJsonButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  }

  /**
   * Exports the current board to a JSON file.
   * @returns A promise that resolves to the Playwright Download object.
   */
  async exportJson() {
    await this.openOptions();
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportJsonButton.click();
    return downloadPromise;
  }

  /**
   * Clears all items and tiers from the board after a confirmation dialog.
   */
  async clearBoard() {
    await this.openOptions();
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.clearBoardButton.click({ delay: 50 });
    await expect(this.clearBoardButton).toBeHidden();
  }

  /**
   * Gets a tier row locator by its label.
   * @param label - The tier label (e.g., 'S', 'A').
   * @returns The tier row locator.
   */
  getTierRow(label: string) {
    return this.page.locator(`[data-tier-label="${label}"]`);
  }
  
  /**
   * Gets a media card locator by its ID.
   * @param id - The item ID.
   * @returns The media card locator.
   */
  getMediaCard(id: string) {
    return this.page.getByTestId(`media-card-${id}`);
  }

  /**
   * Renames a tier.
   * @param oldLabel - Current label.
   * @param newLabel - New label.
   */
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

  /**
   * Deletes a tier after a confirmation dialog.
   * @param label - The label of the tier to delete.
   */
  async deleteTier(label: string) {
    const row = this.getTierRow(label);
    await row.getByTitle('Tier Settings').click({ delay: 100 });
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.page.getByRole('button', { name: /Delete Tier/i }).click({ delay: 100 });
  }

  /**
   * Changes the color of a tier.
   * @param label - The label of the tier.
   */
  async changeTierColor(label: string) {
    const row = this.getTierRow(label);
    await row.getByTitle('Tier Settings').click({ delay: 100 });
    await this.page.getByTitle('Blue').click({ delay: 100 });
    await this.page.keyboard.press('Escape');
  }

  /**
   * Moves an item from its current position to a specific tier's drop zone.
   * @param itemId - The ID of the item to move.
   * @param targetTierLabel - The label of the destination tier.
   */
  async moveItemToTier(itemId: string, targetTierLabel: string) {
    const card = this.getMediaCard(itemId);
    const targetTier = this.getTierRow(targetTierLabel);
    const dropZone = targetTier.getByTestId('tier-drop-zone');

    await manualDragAndDrop(this.page, card, dropZone);
  }

  /**
   * Reorders tiers using keyboard shortcuts (Space, ArrowUp/Down, Space).
   * Much more stable in headless environments than mouse simulation.
   * @param sourceIndex - Original index of the tier.
   * @param targetIndex - Destination index of the tier.
   */
  async reorderTiersViaKeyboard(sourceIndex: number, targetIndex: number) {
    const handle = this.tierDragHandles.nth(sourceIndex);
    await handle.focus();
    await this.page.keyboard.press(' '); // Start drag
    
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(300); // Wait for drag start to be registered
    
    const steps = Math.abs(sourceIndex - targetIndex);
    const key = targetIndex < sourceIndex ? 'ArrowUp' : 'ArrowDown';
    
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(key);
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await this.page.waitForTimeout(300); // Increased for Firefox stability
    }
    
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(300); // Let the last move settle
    await this.page.keyboard.press(' '); // End drag
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(1000); // Wait for animations to finish
  }

  /**
   * Reorders items within a tier using keyboard shortcuts.
   * @param tierLabel - Label of the tier.
   * @param sourceIndex - Original index of the item.
   * @param targetIndex - Destination index of the item.
   */
  async reorderItemsViaKeyboard(tierLabel: string, sourceIndex: number, targetIndex: number) {
    const tierRow = this.getTierRow(tierLabel);
    const cards = tierRow.getByTestId(/^media-card-item-/);
    const sourceCard = cards.nth(sourceIndex);

    await sourceCard.focus();
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(300);
    
    await this.page.keyboard.press(' '); // Start drag
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(300);
    
    const steps = Math.abs(sourceIndex - targetIndex);
    const key = targetIndex < sourceIndex ? 'ArrowLeft' : 'ArrowRight';
    
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(key);
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await this.page.waitForTimeout(300);
    }
    
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press(' '); // End drag
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(1000);
  }
}
