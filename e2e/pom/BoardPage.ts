import { expect, type Locator, type Page } from '@playwright/test';
import { nativeDragAndDrop } from '../utils/drag';

export class BoardPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly addTierButton: Locator;
  readonly optionsButton: Locator;
  readonly importJsonButton: Locator;
  readonly exportJsonButton: Locator;
  readonly resetItemsButton: Locator;
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
    this.resetItemsButton = page.getByTestId('reset-items-button');
    this.clearBoardButton = page.getByTestId('clear-board-button');
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
    await this.page.goto(id ? `/board/${id}` : '/', { waitUntil: 'commit' });
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

    // disable for now
    // eslint-disable-next-line playwright/no-force-option
    await this.optionsButton.click({ force: true });
    // Wait for animation or options to fully span out
    await this.clearBoardButton.waitFor({ state: 'attached', timeout: 5000 });
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
    // disable for now
    // eslint-disable-next-line playwright/no-force-option
    await this.clearBoardButton.click({ force: true });
    
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(500);
    
    // Give Redux slightly more time to dispatch the layout changes
    await expect(this.getTierRow('S')).toBeHidden({ timeout: 5000 });
  }

  /**
   * Resets all items to the unranked tier after a confirmation dialog.
   */
  async resetItems() {
    await this.openOptions();
    this.page.once('dialog', (dialog) => dialog.accept());
    // disable for now
    // eslint-disable-next-line playwright/no-force-option
    await this.resetItemsButton.click({ force: true });

    // wait for layout change to flush
    await expect(this.getTierRow('S').getByTestId(/item-card-/)).toHaveCount(0, { timeout: 10_000 });
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
  getItemCard(id: string) {
    const fullId = id.includes(':') ? id : `rawg:game:${id}`;
    return this.tierRows.getByTestId(`item-card-${fullId}`);
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
    const card = this.getItemCard(itemId);
    const targetTier = this.getTierRow(targetTierLabel);
    const dropZone = targetTier.getByTestId('tier-drop-zone');

    await nativeDragAndDrop(this.page, card.first(), dropZone);
  }

  /**
   * Reorders tiers using native drag and drop.
   * @param sourceIndex - Original index of the tier.
   * @param targetIndex - Destination index of the tier.
   */
  async reorderTiersViaPointer(sourceIndex: number, targetIndex: number) {
    const sourceLabel = await this.tierLabels.nth(sourceIndex).textContent();
    
    const sourceHandle = this.tierDragHandles.nth(sourceIndex);
    const targetHandle = this.tierDragHandles.nth(targetIndex);

    await nativeDragAndDrop(this.page, sourceHandle, targetHandle);

    // Verify final position using polling
    await expect
      .poll(async () => {
        const labels = await this.getTierLabels();
        return labels[targetIndex];
      })
      .toBe(sourceLabel);
  }

  /**
   * Reorders items within a tier using native drag and drop.
   * @param tierLabel - Label of the tier.
   * @param sourceIndex - Original index of the item.
   * @param targetIndex - Destination index of the item.
   */
  async reorderItemsViaPointer(tierLabel: string, sourceIndex: number, targetIndex: number) {
    const tierRow = this.getTierRow(tierLabel);
    const cards = tierRow.getByTestId(/^item-card-/);
    
    // We must wait for the cards to be attached
    await expect(cards.nth(sourceIndex)).toBeVisible();
    await expect(cards.nth(targetIndex)).toBeVisible();

    const sourceCard = cards.nth(sourceIndex).first();
    const targetCard = cards.nth(targetIndex).first();
    const sourceText = await sourceCard.textContent();

    const box = await targetCard.boundingBox();
    const sourceBox = await sourceCard.boundingBox();
    if (!box || !sourceBox) throw new Error('Could not get target bounding box during reorder');

    console.log(`Reorder DOM BoundingBoxes: item[${sourceIndex}] =`, sourceBox, `item[${targetIndex}] =`, box);

    // If moving backward (1 to 0), aim for the left edge.
    // If moving forward (0 to 1), aim for the right edge.
    const isMovingBackwards = sourceIndex > targetIndex;
    const targetPos = isMovingBackwards
      ? { x: 5, y: box.height / 2 }
      : { x: box.width - 5, y: box.height / 2 };

    await nativeDragAndDrop(this.page, sourceCard, targetCard, {
      targetPosition: targetPos,
    });

    // Verify final position using async polling mechanism
    await expect
      .poll(async () => {
        // As a safeguard we look for the exact test id format with no trailing clone id.
        const currentTarget = tierRow.locator(`[data-testid^="item-card-"]`).nth(targetIndex);
        return await currentTarget.textContent();
      })
      .toContain(sourceText);
  }
}
