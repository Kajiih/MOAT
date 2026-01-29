/**
 * @file media-types/definitions/music.ts
 * @description Media type definitions for music-related types.
 */

import { Disc, Music, User } from 'lucide-react';

import { AlbumItem, ArtistItem, SongItem } from '@/lib/types';

import { MediaTypeDefinition } from '../types';

export const artistDefinition: MediaTypeDefinition = {
  id: 'artist',
  category: 'music',
  
  label: 'Artist',
  labelPlural: 'Artists',
  icon: User,
  colorClass: 'text-purple-400',
  
  getSubtitle: (item) => (item as ArtistItem).disambiguation || '',
  getTertiaryText: (item) => (item.year ? `Est. ${item.year}` : 'Artist'),
  
  filters: [
    {
      id: 'yearRange',
      label: 'Born / Formed',
      type: 'range',
      defaultValue: { min: '', max: '' },
    },
    {
      id: 'tag',
      label: 'Tag / Genre',
      type: 'text',
      placeholder: 'e.g. rock, jazz, 80s...',
      defaultValue: '',
    },
    {
      id: 'artistType',
      label: 'Artist Type',
      type: 'select',
      options: [
        { label: 'Any Type', value: '' },
        { label: 'Person', value: 'Person' },
        { label: 'Group', value: 'Group' },
        { label: 'Orchestra', value: 'Orchestra' },
        { label: 'Choir', value: 'Choir' },
        { label: 'Character', value: 'Character' },
        { label: 'Other', value: 'Other' },
      ],
      defaultValue: '',
    },
    {
      id: 'artistCountry',
      label: 'Country',
      type: 'text',
      placeholder: 'e.g. US, GB, JP...',
      defaultValue: '',
    },
  ],
  
  sortOptions: [
    { value: 'relevance', label: 'Relevance' },
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
    artistType: '',
    artistCountry: '',
    sort: 'relevance',
  },
  
  searchable: true,
  supportsDetails: true,
};

export const albumDefinition: MediaTypeDefinition = {
  id: 'album',
  category: 'music',
  
  label: 'Album',
  labelPlural: 'Albums',
  icon: Disc,
  colorClass: 'text-blue-400',
  
  getSubtitle: (item) => (item as AlbumItem).artist || 'Unknown',
  getTertiaryText: (item) => (item.year ? `(${item.year})` : ''),
  
  filters: [
    {
      id: 'selectedArtist',
      paramName: 'artistId',
      label: 'Filter by Artist',
      type: 'picker',
      pickerType: 'artist',
      defaultValue: null,
    },
    {
      id: 'yearRange',
      label: 'Release Year',
      type: 'range',
      defaultValue: { min: '', max: '' },
    },
    {
      id: 'tag',
      label: 'Tag / Genre',
      type: 'text',
      placeholder: 'e.g. rock, jazz, 80s...',
      defaultValue: '',
    },
    {
      id: 'albumPrimaryTypes',
      label: 'Primary Types',
      type: 'toggle-group',
      options: [
        { label: 'Album', value: 'Album' },
        { label: 'EP', value: 'EP' },
        { label: 'Single', value: 'Single' },
        { label: 'Broadcast', value: 'Broadcast' },
        { label: 'Other', value: 'Other' },
      ],
      defaultValue: ['Album', 'EP'],
    },
  ],
  
  sortOptions: [
    { value: 'relevance', label: 'Relevance' },
    { value: 'date_desc', label: 'Date (Newest)' },
    { value: 'date_asc', label: 'Date (Oldest)' },
    { value: 'title_asc', label: 'Name (A-Z)' },
    { value: 'title_desc', label: 'Name (Z-A)' },
  ],
  
  defaultFilters: {
    query: '',
    selectedArtist: null,
    minYear: '',
    maxYear: '',
    tag: '',
    albumPrimaryTypes: ['Album', 'EP'],
    albumSecondaryTypes: [],
    sort: 'relevance',
  },
  
  searchable: true,
  supportsDetails: true,
};

export const songDefinition: MediaTypeDefinition = {
  id: 'song',
  category: 'music',
  
  label: 'Song',
  labelPlural: 'Songs',
  icon: Music,
  colorClass: 'text-green-400',
  
  getSubtitle: (item) => (item as SongItem).album || '',
  getTertiaryText: (item) => {
    const i = item as SongItem;
    const yearSuffix = i.year ? ` (${i.year})` : '';
    return `${i.artist || 'Unknown'}${yearSuffix}`;
  },
  
  filters: [
    {
      id: 'selectedArtist',
      paramName: 'artistId',
      label: 'Filter by Artist',
      type: 'picker',
      pickerType: 'artist',
      defaultValue: null,
    },
    {
      id: 'selectedAlbum',
      paramName: 'albumId',
      label: 'Filter by Album',
      type: 'picker',
      pickerType: 'album',
      defaultValue: null,
    },
    {
      id: 'yearRange',
      label: 'Release Year',
      type: 'range',
      defaultValue: { min: '', max: '' },
    },
    {
      id: 'tag',
      label: 'Tag / Genre',
      type: 'text',
      placeholder: 'e.g. rock, jazz, 80s...',
      defaultValue: '',
    },
    {
      id: 'durationRange',
      label: 'Duration (Seconds)',
      type: 'range',
      placeholder: 'Sec',
      defaultValue: { min: '', max: '' },
    },
  ],
  
  sortOptions: [
    { value: 'relevance', label: 'Relevance' },
    { value: 'date_desc', label: 'Date (Newest)' },
    { value: 'date_asc', label: 'Date (Oldest)' },
    { value: 'title_asc', label: 'Name (A-Z)' },
    { value: 'title_desc', label: 'Name (Z-A)' },
    { value: 'duration_desc', label: 'Duration (Longest)' },
    { value: 'duration_asc', label: 'Duration (Shortest)' },
  ],
  
  defaultFilters: {
    query: '',
    selectedArtist: null,
    selectedAlbum: null,
    minYear: '',
    maxYear: '',
    tag: '',
    minDuration: '',
    maxDuration: '',
    sort: 'relevance',
  },
  
  searchable: true,
  supportsDetails: true,
};
