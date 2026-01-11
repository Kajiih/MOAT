import { describe, it, expect } from 'vitest';
import { getSearchUrl } from './api';

describe('getSearchUrl', () => {
  it('should generate basic url with defaults', () => {
    const url = getSearchUrl({ type: 'album' });
    expect(url).toBe('/api/search?type=album&page=1');
  });

  it('should include query and page', () => {
    const url = getSearchUrl({ type: 'artist', query: 'Beatles', page: 2 });
    expect(url).toBe('/api/search?type=artist&page=2&query=Beatles');
  });

  it('should include filters', () => {
    const url = getSearchUrl({ 
        type: 'album', 
        minYear: '1990', 
        maxYear: '2000' 
    });
    expect(url).toContain('minYear=1990');
    expect(url).toContain('maxYear=2000');
  });

  it('should sort array params for cache consistency', () => {
    // We expect the URL params to be stable regardless of input order
    const url1 = getSearchUrl({ 
        type: 'album', 
        albumPrimaryTypes: ['Single', 'Album'] 
    });
    const url2 = getSearchUrl({ 
        type: 'album', 
        albumPrimaryTypes: ['Album', 'Single'] 
    });
    
    expect(url1).toBe(url2);
    // Specifically check the order in the string if needed, or just equality
    expect(url1).toContain('albumPrimaryTypes=Album&albumPrimaryTypes=Single');
  });

  it('should include duration filters', () => {
    const url = getSearchUrl({ 
        type: 'song', 
        minDuration: 180000, 
        maxDuration: 300000 
    });
    expect(url).toContain('minDuration=180000');
    expect(url).toContain('maxDuration=300000');
  });

  it('should include search config options', () => {
    const url = getSearchUrl({ 
        type: 'song', 
        fuzzy: false, 
        wildcard: true 
    });
    expect(url).toContain('fuzzy=false');
    expect(url).toContain('wildcard=true');
  });
});
