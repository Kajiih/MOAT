/**
 * @file media-types/definitions/cinema.ts
 * @description Media type definitions for cinema-related types.
 */

import { Clapperboard, Tv, User } from 'lucide-react';

import { MediaTypeDefinition } from '../types';

export const movieDefinition: MediaTypeDefinition = {
  id: 'movie',
  category: 'cinema',

  label: 'Movie',
  labelPlural: 'Movies',
  icon: Clapperboard,
  colorClass: 'text-amber-400',

  getSubtitle: (item) => item.year || '',
  getTertiaryText: () => 'Movie',

  filters: [
    {
      id: 'yearRange',
      label: 'Release Year',
      type: 'range',
      minKey: 'minYear',
      maxKey: 'maxYear',
      defaultValue: { min: '', max: '' },
    },
    {
      id: 'tag',
      label: 'Genre / Keywords',
      type: 'text',
      placeholder: 'e.g. Sci-Fi, Horror...',
      defaultValue: '',
    },
  ],

  sortOptions: [
    { value: 'relevance', label: 'Relevance' },
    { value: 'rating_desc', label: 'Rating (Highest)' },
    { value: 'rating_asc', label: 'Rating (Lowest)' },
    { value: 'reviews_desc', label: 'Reviews (Highest)' },
    { value: 'reviews_asc', label: 'Reviews (Lowest)' },
    { value: 'date_desc', label: 'Date (Newest)' },
    { value: 'date_asc', label: 'Date (Oldest)' },
    { value: 'title_asc', label: 'Name (A-Z)' },
    { value: 'title_desc', label: 'Name (Z-A)' },
  ],

  defaultFilters: {
    query: '',
    minYear: '',
    maxYear: '',
    tag: '',
    sort: 'relevance',
  },

  searchable: true,
  supportsDetails: true,
};

export const tvDefinition: MediaTypeDefinition = {
  id: 'tv',
  category: 'cinema',

  label: 'TV Show',
  labelPlural: 'TV Shows',
  icon: Tv,
  colorClass: 'text-pink-400',

  getSubtitle: (item) => item.year || '',
  getTertiaryText: () => 'TV Series',

  filters: [
    {
      id: 'yearRange',
      label: 'First Air Date',
      type: 'range',
      minKey: 'minYear',
      maxKey: 'maxYear',
      defaultValue: { min: '', max: '' },
    },
    {
      id: 'tag',
      label: 'Genre / Keywords',
      type: 'text',
      placeholder: 'e.g. Drama, Comedy...',
      defaultValue: '',
    },
  ],

  sortOptions: [
    { value: 'relevance', label: 'Relevance' },
    { value: 'rating_desc', label: 'Rating (Highest)' },
    { value: 'rating_asc', label: 'Rating (Lowest)' },
    { value: 'reviews_desc', label: 'Reviews (Highest)' },
    { value: 'reviews_asc', label: 'Reviews (Lowest)' },
    { value: 'date_desc', label: 'Date (Newest)' },
    { value: 'date_asc', label: 'Date (Oldest)' },
    { value: 'title_asc', label: 'Name (A-Z)' },
    { value: 'title_desc', label: 'Name (Z-A)' },
  ],

  defaultFilters: {
    query: '',
    minYear: '',
    maxYear: '',
    tag: '',
    sort: 'relevance',
  },

  searchable: true,
  supportsDetails: true,
};

export const personDefinition: MediaTypeDefinition = {
  id: 'person',
  category: 'cinema',

  label: 'Person',
  labelPlural: 'People',
  icon: User,
  colorClass: 'text-teal-400',

  getSubtitle: () => 'Person',
  getTertiaryText: () => 'Actor/Crew',

  filters: [],

  sortOptions: [
    { value: 'relevance', label: 'Relevance' },
    { value: 'title_asc', label: 'Name (A-Z)' },
    { value: 'title_desc', label: 'Name (Z-A)' },
  ],

  defaultFilters: {
    query: '',
    sort: 'relevance',
  },

  searchable: true,
  supportsDetails: true,
};
