/**
 * @file media-types/definitions/books.ts
 * @description Media type definitions for book-related types.
 */

import { Book, User } from 'lucide-react';

import { BookItem } from '@/lib/types';

import { MediaTypeDefinition } from '../types';

export const bookDefinition: MediaTypeDefinition = {
  id: 'book',
  category: 'book',

  label: 'Book',
  labelPlural: 'Books',
  icon: Book,
  colorClass: 'text-amber-600',

  getSubtitle: (item) => (item as BookItem).author || 'Unknown Author',
  getTertiaryText: (item) => (item.year ? `(${item.year})` : ''),

  filters: [
    {
      id: 'selectedAuthor',
      paramName: 'author',
      label: 'Filter by Author',
      type: 'picker',
      pickerType: 'author',
      defaultValue: null,
    },
    {
      id: 'yearRange',
      label: 'First Publish Year',
      type: 'range',
      minKey: 'minYear',
      maxKey: 'maxYear',
      defaultValue: { min: '', max: '' },
    },
    {
      id: 'bookType',
      label: 'Genre / Type',
      type: 'select',
      options: [
        { label: 'Any', value: '' },
        { label: 'Fiction', value: 'fiction' },
        { label: 'Non-Fiction', value: 'non-fiction' },
        { label: 'Compilation', value: 'compilation' },
        { label: 'Anthology', value: 'anthology' },
        { label: 'Textbook', value: 'textbook' },
        { label: 'Biography', value: 'biography' },
      ],
      defaultValue: '',
    },
    {
      id: 'language',
      label: 'Language',
      type: 'select',
      options: [
        { label: 'Any', value: '' },
        { label: 'English', value: 'eng' },
        { label: 'French', value: 'fre' },
        { label: 'Spanish', value: 'spa' },
        { label: 'German', value: 'ger' },
        { label: 'Italian', value: 'ita' },
        { label: 'Japanese', value: 'jpn' },
      ],
      defaultValue: '',
    },
    {
      id: 'publisher',
      label: 'Publisher',
      type: 'text',
      placeholder: 'e.g. Penguin',
      defaultValue: '',
    },
    {
      id: 'person',
      label: 'Character / Person',
      type: 'text',
      placeholder: 'e.g. Harry Potter',
      defaultValue: '',
    },
    {
      id: 'place',
      label: 'Setting / Place',
      type: 'text',
      placeholder: 'e.g. London',
      defaultValue: '',
    },
  ],

  sortOptions: [
    { value: 'relevance', label: 'Relevance' },
    { value: 'date_desc', label: 'Date (Newest)', apiValue: 'new' },
    { value: 'date_asc', label: 'Date (Oldest)', apiValue: 'old' },
  ],

  defaultFilters: {
    query: '',
    selectedAuthor: null,
    minYear: '',
    maxYear: '',
    bookType: '',
    language: '',
    publisher: '',
    person: '',
    place: '',
    sort: 'relevance',
  },

  searchable: true,
  supportsDetails: true,
};

export const authorDefinition: MediaTypeDefinition = {
  id: 'author',
  category: 'book',

  label: 'Author',
  labelPlural: 'Authors',
  icon: User,
  colorClass: 'text-amber-500',

  getSubtitle: () => 'Author',
  getTertiaryText: (item) => (item.year ? `Born: ${item.year}` : ''),

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
