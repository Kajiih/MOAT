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

    await this.optionsButton.click();
    // Wait for the Radix Popover animation to complete and be fully actionable
    await this.clearBoardButton.waitFor({ state: 'visible', timeout: 5000 });
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
    
    await this.clearBoardButton.click();
    
    // Give Redux slightly more time to dispatch the layout changes
    await expect(this.getTierRow('S')).toBeHidden({ timeout: 5000 });
  }

  /**
   * Resets all items to the unranked tier after a confirmation dialog.
   */
  async resetItems() {
    await this.openOptions();
    this.page.once('dialog', (dialog) => dialog.accept());
    
    await this.resetItemsButton.click();

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
   * Semantically deletes an item from the board using the global hotkey 'x'.
   * @param itemId - The ID of the item to delete.
   */
  async deleteItem(itemId: string) {
    const card = this.getItemCard(itemId).first();
    await card.hover();
    await this.page.keyboard.press('x');
  }

  /**
   * Asserts that an item exists within a specific tier.
   * @param itemId - The ID of the item.
   * @param tierLabel - The label of the tier.
   */
  async expectItemInTier(itemId: string, tierLabel: string) {
    const tierRow = this.getTierRow(tierLabel);
    const fullId = itemId.includes(':') ? itemId : `rawg:game:${itemId}`;
    const card = tierRow.getByTestId(`item-card-${fullId}`);
    await expect(card).toBeVisible();
  }

  /**
   * Asserts that an item does not exist within a specific tier.
   * @param itemId - The ID of the item.
   * @param tierLabel - The label of the tier.
   */
  async expectItemNotInTier(itemId: string, tierLabel: string) {
    const tierRow = this.getTierRow(tierLabel);
    const fullId = itemId.includes(':') ? itemId : `rawg:game:${itemId}`;
    const card = tierRow.getByTestId(`item-card-${fullId}`);
    await expect(card).toBeHidden();
  }

  /**
   * Semantically asserts the total number of tier rows currently existing on the board.
   * @param expectedCount - The expected number of tiers.
   */
  async expectTierCount(expectedCount: number) {
    await expect(this.tierLabels).toHaveCount(expectedCount);
  }

  /**
   * Semantically asserts the total number of items contained within a specific tier.
   * @param tierLabel - The label of the targeted tier.
   * @param expectedCount - The expected number of items.
   * @param options - Optional assertions, such as timeouts for layout hydration.
   */
  async expectTierToHaveItemCount(tierLabel: string, expectedCount: number, options?: { timeout?: number }) {
    const tierRow = this.getTierRow(tierLabel);
    const itemCards = tierRow.getByTestId(/^item-card-/);
    await expect(itemCards).toHaveCount(expectedCount, options);
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
   * Semantically moves an item to the absolute beginning of a tier.
   * @param itemId - The ID of the item being moved.
   * @param targetTierLabel - The label of the destination tier.
   */
  async moveItemToStartOfTier(itemId: string, targetTierLabel: string) {
    const tierRow = this.getTierRow(targetTierLabel);
    const cards = tierRow.getByTestId(/^item-card-/);
    
    // We exclude the item we are currently moving in case it is already in this tier
    const searchToken = itemId.replace(/[^a-zA-Z0-9-]/g, '');
    const otherCards = cards.filter({ hasNot: this.page.locator(`[data-testid*="${searchToken}"]`) });
    
    const count = await otherCards.count();
    
    if (count === 0) {
      // Tier is empty, just drop it in the generic zone
      const card = this.getItemCard(itemId);
      const dropZone = tierRow.getByTestId('tier-drop-zone');
      await nativeDragAndDrop(this.page, card.first(), dropZone);
    } else {
      // Drop it before the first existing item
      const firstCardIdStr = await otherCards.first().getAttribute('data-testid');
      const match = firstCardIdStr?.match(/item-card-(.+)$/);
      if (!match) throw new Error('Could not extract neighbor ID');
      await this.moveItemBeforeItem(itemId, match[1]);
    }
  }

  /**
   * Semantically moves an item to the absolute end of a tier.
   * @param itemId - The ID of the item being moved.
   * @param targetTierLabel - The label of the destination tier.
   */
  async moveItemToEndOfTier(itemId: string, targetTierLabel: string) {
    const tierRow = this.getTierRow(targetTierLabel);
    const cards = tierRow.getByTestId(/^item-card-/);
    
    const searchToken = itemId.replace(/[^a-zA-Z0-9-]/g, '');
    const otherCards = cards.filter({ hasNot: this.page.locator(`[data-testid*="${searchToken}"]`) });
    
    const count = await otherCards.count();
    
    if (count === 0) {
      const card = this.getItemCard(itemId);
      const dropZone = tierRow.getByTestId('tier-drop-zone');
      await nativeDragAndDrop(this.page, card.first(), dropZone);
    } else {
      // Drop it after the last existing item
      const lastCardIdStr = await otherCards.last().getAttribute('data-testid');
      const match = lastCardIdStr?.match(/item-card-(.+)$/);
      if (!match) throw new Error('Could not extract neighbor ID');
      await this.moveItemAfterItem(itemId, match[1]);
    }
  }

  /**
   * Reorders tiers using native drag and drop.
   * @param sourceIndex - Original index of the tier.
   * @param targetIndex - Destination index of the tier.
   */
  async reorderTiersViaPointer(sourceIndex: number, targetIndex: number) {
    const sourceLabel = await this.tierLabels.nth(sourceIndex).textContent();
    
    // The DragEvent MUST originate from the strict Handle DOM element so PRDnD accepts the handle bounds check
    const sourceHandle = this.tierDragHandles.nth(sourceIndex);
    
    // The Drop Target MUST be the entire Row so we can target its top/bottom boundaries accurately
    const targetRow = this.tierRows.nth(targetIndex);

    const isMovingUp = sourceIndex > targetIndex;

    const box = await targetRow.boundingBox();
    if (!box) throw new Error('Could not get target bounding box during tier reorder');

    await nativeDragAndDrop(this.page, sourceHandle, targetRow, {
      targetPosition: isMovingUp ? { x: box.width / 2, y: 10 } : { x: box.width / 2, y: box.height - 10 }
    });

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

  /**
   * Semantically moves an item so it sits immediately before a target item.
   * @param sourceItemId - The ID of the item being moved.
   * @param targetItemId - The ID of the item it should go before.
   */
  async moveItemBeforeItem(sourceItemId: string, targetItemId: string) {
    const sourceCard = this.getItemCard(sourceItemId).first();
    const targetCard = this.getItemCard(targetItemId).first();
    
    // Ensure visibility
    await expect(sourceCard).toBeVisible();
    await expect(targetCard).toBeVisible();

    const box = await targetCard.boundingBox();
    if (!box) throw new Error(`Could not get target bounding box for item ${targetItemId}`);
    
    await nativeDragAndDrop(this.page, sourceCard, targetCard, {
      targetPosition: { x: 5, y: box.height / 2 },
    });
  }

  /**
   * Semantically moves an item so it sits immediately after a target item.
   * @param sourceItemId - The ID of the item being moved.
   * @param targetItemId - The ID of the item it should go after.
   */
  async moveItemAfterItem(sourceItemId: string, targetItemId: string) {
    const sourceCard = this.getItemCard(sourceItemId).first();
    const targetCard = this.getItemCard(targetItemId).first();
    
    // Ensure visibility
    await expect(sourceCard).toBeVisible();
    await expect(targetCard).toBeVisible();

    const box = await targetCard.boundingBox();
    if (!box) throw new Error(`Could not get target bounding box for item ${targetItemId}`);
    
    await nativeDragAndDrop(this.page, sourceCard, targetCard, {
      targetPosition: { x: box.width - 5, y: box.height / 2 },
    });
  }

  /**
   * Shifts an item one slot to the right by moving it after its immediate right neighbor.
   * @param itemId - The ID of the item to shift right.
   */
  async shiftItemRight(itemId: string) {
    const card = this.getItemCard(itemId).first();
    const tierDropZone = card.locator('xpath=ancestor::*[contains(@data-testid, "tier-drop-zone")]').first();
    const cards = tierDropZone.locator('[data-testid^="item-card-"]');
    
    const count = await cards.count();
    let sourceIndex = -1;
    const searchToken = itemId.replace(/[^a-zA-Z0-9-]/g, '');

    for (let i = 0; i < count; i++) {
      const parentIdStr = await cards.nth(i).getAttribute('data-testid');
      if (parentIdStr && parentIdStr.includes(searchToken)) {
        sourceIndex = i;
        break;
      }
    }
    
    if (sourceIndex === -1) throw new Error('Could not find item index to shift right');
    if (sourceIndex === count - 1) throw new Error('Cannot shift item right: already at the end of the tier');
    
    // Find the ID of the right neighbor
    const neighborIdStr = await cards.nth(sourceIndex + 1).getAttribute('data-testid');
    const neighborIdMatch = neighborIdStr?.match(/item-card-(.+)$/);
    if (!neighborIdMatch) throw new Error('Could not extract neighbor ID');
    
    await this.moveItemAfterItem(itemId, neighborIdMatch[1]);
  }

  /**
   * Shifts an item one slot to the left by moving it before its immediate left neighbor.
   * @param itemId - The ID of the item to shift left.
   */
  async shiftItemLeft(itemId: string) {
    const card = this.getItemCard(itemId).first();
    const tierDropZone = card.locator('xpath=ancestor::*[contains(@data-testid, "tier-drop-zone")]').first();
    const cards = tierDropZone.locator('[data-testid^="item-card-"]');
    
    const count = await cards.count();
    let sourceIndex = -1;
    const searchToken = itemId.replace(/[^a-zA-Z0-9-]/g, '');

    for (let i = 0; i < count; i++) {
      const parentIdStr = await cards.nth(i).getAttribute('data-testid');
      if (parentIdStr && parentIdStr.includes(searchToken)) {
        sourceIndex = i;
        break;
      }
    }
    
    if (sourceIndex === -1) throw new Error('Could not find item index to shift left');
    if (sourceIndex === 0) throw new Error('Cannot shift item left: already at the start of the tier');
    
    // Find the ID of the left neighbor
    const neighborIdStr = await cards.nth(sourceIndex - 1).getAttribute('data-testid');
    const neighborIdMatch = neighborIdStr?.match(/item-card-(.+)$/);
    if (!neighborIdMatch) throw new Error('Could not extract neighbor ID');
    
    await this.moveItemBeforeItem(itemId, neighborIdMatch[1]);
  }
}
