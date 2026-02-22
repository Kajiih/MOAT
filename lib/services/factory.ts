/**
 * @file factory.ts
 * @description Registry to manage global MediaService instances.
 */
import { BoardCategory } from '@/lib/types';

import { OpenLibraryService } from './books/OpenLibraryService';
import { TMDBService } from './cinema/TMDBService';
import { RAWGService } from './games/RAWGService';
import { MusicService } from './music/MusicService';
import { AnyMediaService } from './types';

/**
 * Registry to manage MediaService instances dynamically.
 */
class MediaServiceRegistry {
  private services = new Map<BoardCategory, AnyMediaService>();
  private fallbackService: AnyMediaService;

  constructor() {
    // Instantiate services
    const music = new MusicService();
    const cinema = new TMDBService();
    const book = new OpenLibraryService();
    const game = new RAWGService();

    // Register them
    this.register(music as AnyMediaService);
    this.register(cinema as AnyMediaService);
    this.register(book as AnyMediaService);
    this.register(game as AnyMediaService);

    this.fallbackService = music as unknown as AnyMediaService;
  }

  register(service: AnyMediaService) {
    this.services.set(service.category, service);
  }

  get(category: BoardCategory): AnyMediaService {
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
export function getMediaService(category: BoardCategory = 'music'): AnyMediaService {
  return registry.get(category);
}
