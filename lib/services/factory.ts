/**
 * @file factory.ts
 * @description Registry to manage global MediaService instances.
 */
import { BoardCategory } from '@/lib/types';

import { OpenLibraryService } from './books/OpenLibraryService';
import { TMDBService } from './cinema/TMDBService';
import { MusicService } from './music/MusicService';
import { MediaService } from './types';

/**
 * Registry to manage MediaService instances dynamically.
 */
class MediaServiceRegistry {
  private services = new Map<BoardCategory, MediaService>();
  private fallbackService: MediaService;

  constructor() {
    // Instantiate services
    const music = new MusicService();
    const cinema = new TMDBService();
    const book = new OpenLibraryService();

    // Register them
    this.register(music);
    this.register(cinema);
    this.register(book);

    this.fallbackService = music;
  }

  register(service: MediaService) {
    this.services.set(service.category, service);
  }

  get(category: BoardCategory): MediaService {
    return this.services.get(category) || this.fallbackService;
  }
}

// Singleton instances
const registry = new MediaServiceRegistry();

/**
 * Factory to get the appropriate MediaService for a given board category.
 * @param category - The category of the board (music, cinema, etc.)
 * @returns The MediaService instance.
 */
export function getMediaService(category: BoardCategory = 'music'): MediaService {
  return registry.get(category);
}
