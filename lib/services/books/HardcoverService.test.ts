import { describe, expect, it } from 'vitest';

import { setupMSW } from '@/lib/test/msw-test-utils';
import { BookItem, SeriesItem } from '@/lib/types';

import { HardcoverService } from './HardcoverService';
import { hardcoverHandlers } from './mocks/hardcover-handlers';

describe('HardcoverService Integration (Fake Server)', () => {
  const service = new HardcoverService();

  setupMSW(hardcoverHandlers);

  it('should find books by title', async () => {
    const result = await service.search('Fellowship', 'book');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('The Fellowship of the Ring');
    expect(result.results[0].type).toBe('book');
    expect((result.results[0] as BookItem).author).toBe('J.R.R. Tolkien');
    expect(result.results[0].imageUrl).toContain('book/101.jpg');
  });

  it('should find series by name', async () => {
    const result = await service.search('Witcher', 'series');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('The Witcher');
    expect(result.results[0].type).toBe('series');
    expect((result.results[0] as SeriesItem).bookCount).toBe(8);
  });

  it('should find authors by name', async () => {
    const result = await service.search('Tolkien', 'author');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('J.R.R. Tolkien');
    expect(result.results[0].type).toBe('author');
  });

  it('should handle empty results', async () => {
    const result = await service.search('NonExistent', 'book');
    expect(result.results).toHaveLength(0);
  });
});
