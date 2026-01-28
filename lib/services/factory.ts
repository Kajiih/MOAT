/**
 * @file factory.ts
 * @description Factory for retrieving the appropriate MediaService based on board category.
 */

import { BoardCategory } from '@/lib/types';

import { TMDBService } from './cinema/TMDBService';
import { MusicService } from './music/MusicService';
import { MediaService } from './types';

// Singleton instances to avoid recreation
const musicService = new MusicService();
const cinemaService = new TMDBService();

/**
 * Factory to get the appropriate MediaService for a given board category.
 * @param category - The category of the board (music, cinema, etc.)
 * @returns The MediaService instance.
 */
export function getMediaService(category: BoardCategory = 'music'): MediaService {
  switch (category) {
    case 'music': {
      return musicService;
    }
    // Future categories will be added here
    case 'cinema': {
      return cinemaService;
    }
    case 'game':
    case 'book': {
      throw new Error(`Service for category "${category}" is not implemented yet.`);
    }
    default: {
      // Fallback to music for safety in legacy cases
      return musicService;
    }
  }
}
