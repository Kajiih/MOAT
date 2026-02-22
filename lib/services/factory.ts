/**
 * @file factory.ts
 * @description Registry to manage global MediaService instances.
 */
import { BoardCategory } from '@/lib/types';

import { OpenLibraryService } from './books/OpenLibraryService';
import { TMDBService } from './cinema/TMDBService';
import { IGDBService } from './games/IGDBService';
import { RAWGService } from './games/RAWGService';
import { MusicService } from './music/MusicService';
import { AnyMediaService } from './types';

/**
 * Registry to manage MediaService instances dynamically.
 */
class MediaServiceRegistry {
  private services = new Map<BoardCategory, AnyMediaService[]>();
  private fallbackService: AnyMediaService;

  constructor() {
    // Instantiate services
    const music = new MusicService();
    const cinema = new TMDBService();
    const book = new OpenLibraryService();
    const rawg = new RAWGService();
    const igdb = new IGDBService();

    // Register them
    this.register(music as AnyMediaService);
    this.register(cinema as AnyMediaService);
    this.register(book as AnyMediaService);
    this.register(rawg as AnyMediaService);
    this.register(igdb as AnyMediaService);

    this.fallbackService = music as unknown as AnyMediaService;
  }

  register(service: AnyMediaService) {
    const existing = this.services.get(service.category) || [];
    this.services.set(service.category, [...existing, service]);
  }

  get(category: BoardCategory, serviceId?: string): AnyMediaService {
    const categoryServices = this.services.get(category) || [];
    if (serviceId) {
      const service = categoryServices.find((s) => s.constructor.name.toLowerCase().includes(serviceId.toLowerCase()));
      if (service) return service;
    }
    return categoryServices[0] || this.fallbackService;
  }
}

// Singleton instances
const registry = new MediaServiceRegistry();

/**
 * Factory to get the appropriate MediaService for a given board category.
 * @param category - The category of the board (music, cinema, etc.)
 * @returns The MediaService instance.
 */
export function getMediaService(
  category: BoardCategory = 'music',
  serviceId?: string,
): AnyMediaService {
  return registry.get(category, serviceId);
}
