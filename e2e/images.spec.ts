import { expect, test } from './fixtures';

test.describe('Image Visibility', () => {
  test('should successfully load and display remote images without error handlers triggering', async ({
    page,
    boardPage,
    searchPanel,
  }) => {
    
    await boardPage.goto();

    // --- 1. Test RAWG Database Image Rendering (Game Cover) ---
    await searchPanel.switchTab('game');
    await searchPanel.search('Grand Theft Auto V');

    const rawgCard = page.getByTestId('item-card-rawg:game:3498'); // GTA V ID
    await expect(rawgCard).toBeVisible({ timeout: 15_000 });
    
    const rawgImg = rawgCard.locator('img');
    await expect(rawgImg).toBeVisible({ timeout: 10_000 });

    await expect(async () => {
      const isImageFullyLoaded = await rawgImg.evaluate((element: HTMLImageElement) => {
        return element.complete && element.naturalHeight !== 0;
      });
      expect(isImageFullyLoaded).toBe(true);
    }).toPass({ timeout: 15_000 });


    // --- 2. Test MusicBrainz Database Image Rendering via Proxy ---
    await page.getByRole('button', { name: 'MusicBrainz' }).click();

    // 2a. Test Artist (Wikidata Redirect Proxy)
    await searchPanel.switchTab('artist');
    await searchPanel.search('Linkin Park');

    const artistCard = page.getByTestId('item-card-musicbrainz:artist:f59c5520-5f46-4d2c-b2c4-822eabf53419');
    await expect(artistCard).toBeVisible({ timeout: 15_000 });

    const artistImg = artistCard.locator('img');
    await expect(artistImg).toBeVisible({ timeout: 10_000 });

    await expect(async () => {
      const isImageFullyLoaded = await artistImg.evaluate((element: HTMLImageElement) => {
        return element.complete && element.naturalHeight !== 0;
      });
      expect(isImageFullyLoaded).toBe(true);
    }).toPass({ timeout: 15_000 });

    // 2b. Test Album (CoverArtArchive Redirect Proxy)
    await searchPanel.switchTab('album');
    await searchPanel.search('Meteora');
    
    // UUID for Meteora release group
    const albumCard = page.getByTestId('item-card-musicbrainz:album:14e449a5-aaeb-34dd-ba2f-04cbfa0e7fca');
    await expect(albumCard).toBeVisible({ timeout: 15_000 });

    const albumImg = albumCard.locator('img');
    await expect(albumImg).toBeVisible({ timeout: 10_000 });

    await expect(async () => {
      const isImageFullyLoaded = await albumImg.evaluate((element: HTMLImageElement) => {
        return element.complete && element.naturalHeight !== 0;
      });
      expect(isImageFullyLoaded).toBe(true);
    }).toPass({ timeout: 15_000 });

  });
});
