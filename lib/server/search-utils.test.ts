import { describe, it, expect } from 'vitest';
import { buildMusicBrainzQuery } from './search-utils';
import { MediaType } from '@/lib/types';

const defaultOptions = { fuzzy: false, wildcard: false };

describe('buildMusicBrainzQuery', () => {
  it('should build basic album query', () => {
    const params = {
      type: 'album' as MediaType,
      query: 'Abbey Road',
      artist: null,
      artistId: null,
      minYear: null,
      maxYear: null,
      albumPrimaryTypes: [],
      albumSecondaryTypes: [],
      options: defaultOptions,
      page: 1
    };

    const { endpoint, query } = buildMusicBrainzQuery(params);
    expect(endpoint).toBe('release-group');
    expect(query).toContain('release-group:(Abbey AND Road)');
    // Default mode excludes secondary types
    expect(query).toContain('NOT secondarytype:');
  });

  it('should build basic artist query', () => {
    const params = {
      type: 'artist' as MediaType,
      query: 'Beatles',
      artist: null,
      artistId: null,
      minYear: null,
      maxYear: null,
      albumPrimaryTypes: [],
      albumSecondaryTypes: [],
      options: defaultOptions,
      page: 1
    };

    const { endpoint, query } = buildMusicBrainzQuery(params);
    expect(endpoint).toBe('artist');
    expect(query).toBe('artist:(Beatles)');
  });

  it('should handle negative query logic (prepend *:* AND)', () => {
    const params = {
      type: 'album' as MediaType,
      query: '', // Empty query
      artist: null,
      artistId: null,
      minYear: null,
      maxYear: null,
      albumPrimaryTypes: [],
      albumSecondaryTypes: [], // Default excludes all secondary types -> NOT ...
      options: defaultOptions,
      page: 1
    };

    const { query } = buildMusicBrainzQuery(params);
    // Should contain "NOT secondarytype" AND prepend "*:* AND"
    expect(query).toMatch(/^\*:\* AND NOT secondarytype:/);
  });

  it('should include year filter', () => {
    const params = {
      type: 'album' as MediaType,
      query: 'Test',
      artist: null,
      artistId: null,
      minYear: '2000',
      maxYear: '2010',
      albumPrimaryTypes: [],
      albumSecondaryTypes: [],
      options: defaultOptions,
      page: 1
    };

    const { query } = buildMusicBrainzQuery(params);
    expect(query).toContain('firstreleasedate:[2000 TO 2010]');
  });

  it('should use correct date field for artist', () => {
    const params = {
      type: 'artist' as MediaType,
      query: 'Test',
      artist: null,
      artistId: null,
      minYear: '1990',
      maxYear: null,
      albumPrimaryTypes: [],
      albumSecondaryTypes: [],
      options: defaultOptions,
      page: 1
    };

    const { query } = buildMusicBrainzQuery(params);
    expect(query).toContain('begin:[1990 TO *]');
  });

  it('should escape fallback query', () => {
    // If query processing returns empty (simulated here by empty constructLuceneQuery result if it happened)
    // But we test the fallback path by forcing queryParts to be empty logic if inputs are weird?
    // Actually difficult to force fallback if constructLuceneQuery works.
    // But we can test special chars in query input.
    const params = {
      type: 'album' as MediaType,
      query: '!!!',
      artist: null,
      artistId: null,
      minYear: null,
      maxYear: null,
      albumPrimaryTypes: [],
      albumSecondaryTypes: [],
      options: defaultOptions,
      page: 1
    };

    const { query } = buildMusicBrainzQuery(params);
    // constructLuceneQuery returns escaped !!!
    // "!!!" -> "\\!\\!\\!"
    expect(query).toContain('\\\!\\\!\\\!');
  });
});
