/**
 * @file media-types/definitions/games.ts
 * @description Media type definitions for video game types.
 */

import { Building2, Gamepad2, Library } from 'lucide-react';

import { GameFilters } from '../filters';
import { MediaTypeDefinition } from '../types';

export const gameDefinition: MediaTypeDefinition<keyof GameFilters> = {
  id: 'game',
  category: 'game',

  label: 'Video Game',
  labelPlural: 'Video Games',
  icon: Gamepad2,
  colorClass: 'text-purple-400',

  getSubtitle: (item) =>
    [
      'developer' in item && item.developer ? item.developer : undefined,
      item.year,
    ]
      .filter(Boolean)
      .join(' • '),
  getTertiaryText: (item) =>
    'platforms' in item && item.platforms ? item.platforms.join(', ') : 'Game',

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
      id: 'platform',
      label: 'Platform',
      type: 'select',
      options: [
        { label: 'All Platforms', value: '' },
        { label: 'PC', value: '4' },
        { label: 'PlayStation', value: '187,18,16,15,27' },
        { label: 'Xbox', value: '1,186,14,80' },
        { label: 'Nintendo', value: '7,8,9,13,83' },
        { label: 'iOS', value: '3' },
        { label: 'Android', value: '21' },
      ],
      defaultValue: '',
    },
    {
      id: 'tag',
      label: 'Genre / Tags',
      type: 'text',
      placeholder: 'e.g. RPG, Action...',
      defaultValue: '',
    },
  ],

  sortOptions: [
    { value: 'relevance', label: 'Relevance' },
    { value: 'rating_desc', label: 'Rating (Highest)' },
    { value: 'rating_asc', label: 'Rating (Lowest)' },
    { value: 'reviews_desc', label: 'Reviews (Most)' },
    { value: 'reviews_asc', label: 'Reviews (Least)' },
    { value: 'date_desc', label: 'Date (Newest)' },
    { value: 'date_asc', label: 'Date (Oldest)' },
    { value: 'title_asc', label: 'Name (A-Z)' },
    { value: 'title_desc', label: 'Name (Z-A)' },
  ],

  defaultFilters: {
    query: '',
    minYear: '',
    maxYear: '',
    platform: '',
    tag: '',
    sort: 'relevance',
  },

  searchable: true,
  supportsDetails: true,
};

export const developerDefinition: MediaTypeDefinition<keyof GameFilters> = {
  id: 'developer',
  category: 'game',

  label: 'Developer',
  labelPlural: 'Developers',
  icon: Building2,
  colorClass: 'text-indigo-400',

  getSubtitle: () => 'Studio',
  getTertiaryText: () => 'Game Developer',

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

export const franchiseDefinition: MediaTypeDefinition<keyof GameFilters> = {
  id: 'franchise',
  category: 'game',

  label: 'Franchise',
  labelPlural: 'Franchises',
  icon: Library,
  colorClass: 'text-pink-400',

  getSubtitle: (item) =>
    'gameCount' in item && item.gameCount
      ? `${item.gameCount} Games`
      : 'Video Game Series',
  getTertiaryText: () => 'Franchise',

  filters: [],

  sortOptions: [
    { value: 'relevance', label: 'Relevance' },
    { value: 'title_asc', label: 'Name (A-Z)' },
    { value: 'title_desc', label: 'Name (Z-A)' },
    { value: 'date_desc', label: 'Date (Newly Created)' },
    { value: 'date_asc', label: 'Date (Oldest)' },
  ],

  defaultFilters: {
    query: '',
    sort: 'relevance',
  },

  searchable: true,
  supportsDetails: true,
};

