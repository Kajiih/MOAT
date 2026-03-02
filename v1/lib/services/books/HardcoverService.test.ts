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

    expect(result.results).toHaveLength(2);
    expect(result.results[0].title).toBe('The Fellowship of the Ring');
    expect(result.results[0].serviceId).toBe('hardcover');
  });

  it('should exclude compilations when filter is active', async () => {
    const result = await service.search('Fellowship', 'book', {
      filters: { excludeCompilations: ['true'] },
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('The Fellowship of the Ring');
    expect(result.results.find((r) => r.title.includes('Collection'))).toBeUndefined();
  });

  it('should find series by name', async () => {
    const result = await service.search('Witcher', 'series');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('The Witcher');
    expect(result.results[0].imageUrl).toBe('https://images.hardcover.app/book/witcher-cover.jpg');
    expect(result.results[0].type).toBe('series');
    expect((result.results[0] as SeriesItem).bookCount).toBe(8);
  });

  it('should get rich book details', async () => {
    const service = new HardcoverService();
    const details = await service.getDetails('15309', 'book');

    expect(details.title).toBe('Harry Potter and the Philosopher Stone');
    expect(details.description).toContain('young wizard');
    expect(details.rating).toBe(4.5);
    expect(details.tags).toContain('Fantasy');
    expect(details.serviceId).toBe('hardcover');
  });

  it('should get rich series details', async () => {
    const service = new HardcoverService();
    const details = await service.getDetails('1185', 'series');

    expect(details.title).toBe('The Witcher');
    expect(details.description).toContain('Geralt of Rivia');
    expect(details.length).toBe('8 books');
    expect(details.serviceId).toBe('hardcover');
  });

  it('should get rich author details', async () => {
    const service = new HardcoverService();
    const details = await service.getDetails('201', 'author');

    expect(details.title).toBe('J.R.R. Tolkien');
    expect(details.description).toContain('father of modern fantasy');
    expect(details.lifeSpan?.begin).toBe('1892-01-03');
    expect(details.area).toBe('Oxford, UK');
    expect(details.serviceId).toBe('hardcover');
  });

  it('should find authors by name', async () => {
    const result = await service.search('Tolkien', 'author');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('J.R.R. Tolkien');
    expect(result.results[0].type).toBe('author');
    expect(result.results[0].serviceId).toBe('hardcover');
  });

  it('should handle empty results', async () => {
    const result = await service.search('NonExistent', 'book');
    expect(result.results).toHaveLength(0);
  });
});
