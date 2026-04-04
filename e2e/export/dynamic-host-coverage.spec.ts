import { expect, test } from '../fixtures';
import { registry } from '../../src/infra/providers/registry';
// Import bootstrap to populate the registry in the test process
import '../../src/infra/providers/bootstrap';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Dynamic Host Coverage Screenshot Test', () => {
  test('should render images from all allowed hosts', async ({ page, boardPage }, testInfo) => {
    // 1. Get allowed hosts from registry
    await registry.waitUntilReady();
    const hosts = registry.getAllowedImageHosts();
    
    // Add fallback host if not present
    hosts.add('placehold.co');
    
    expect(hosts.size).toBeGreaterThan(1); // Should have real hosts + fallback
    console.log('Testing allowed hosts:', [...hosts]);

    // 2. Generate Board JSON
    const board = {
      version: 2,
      createdAt: new Date().toISOString(),
      title: "Dynamic Host Test Board",
      tiers: [
        {
          label: "S",
          color: "red",
          items: [] as any[]
        }
      ]
    };

    let index = 1;
    for (const host of hosts) {
      // Use a REAL provider ID (rawg) so the app knows how to render the card
      board.tiers[0].items.push({
        id: `rawg:game:test-${index}`,
        identity: {
          providerId: "rawg",
          entityId: "game",
          providerItemId: `test-${index}`
        },
        title: `Item for ${host}`,
        images: [
          {
            type: "url",
            url: `https://${host}/image_${index}.jpg`
          }
        ],
        subtitle: ["Test Subtitle"],
        tertiaryText: "Test Text"
      });
      index++;
    }

    // Write to temp file in test output directory
    const fixturePath = testInfo.outputPath('dynamic-board.json');
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, JSON.stringify(board, null, 2));

    // 3. Mock Proxy to return a stable 1x1 image for ALL requests
    await page.route('**/api/proxy-image**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        ),
      });
    });

    // 4. Run Test
    await boardPage.goto();
    
    // Import the generated JSON
    await boardPage.importJson(fixturePath);

    // Verify at least one item card is visible in Tier S
    const card = boardPage.getTierRow('S').getByTestId(/^item-card-/).first();
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Wait for all images to complete loading
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('img')];
      return images.every(img => img.complete);
    });

    // Take Screenshot using Screenshot Engine (Camera Button)
    const downloadPromise = page.waitForEvent('download');
    await boardPage.cameraButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.png');

    // Clean up temp file
    try {
      fs.unlinkSync(fixturePath);
    } catch (e) {
      console.warn('Failed to clean up temp file:', e);
    }
  });
});
