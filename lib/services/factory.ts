/**
 * @file factory.ts
 * @description Registry to manage global MediaService instances.
 * Supports multiple services per category (e.g., RAWG and IGDB for games).
 */
import { BoardCategory } from '@/lib/types';

import { OpenLibraryService } from './books/OpenLibraryService';
import { TMDBService } from './cinema/TMDBService';
import { IGDBService } from './games/IGDBService';
import { RAWGService } from './games/RAWGService';
import { MusicService } from './music/MusicService';
import { AnyMediaService } from './types';

/**
 * Metadata for a service, usable client-side without importing the service class.
 */
export interface ServiceInfo {
  id: string;
  label: string;
  types: string[];
}

/**
 * Registry to manage MediaService instances dynamically.
 * Supports multiple services per category with id-based lookup.
 */
class MediaServiceRegistry {
  private services = new Map<BoardCategory, AnyMediaService[]>();
  private fallbackService: AnyMediaService;

  constructor() {
    const music = new MusicService();
    const cinema = new TMDBService();
    const book = new OpenLibraryService();
    const rawg = new RAWGService();
    const igdb = new IGDBService();

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

  /**
   * Get a service by category and optional service id.
   */
  get(category: BoardCategory, serviceId?: string): AnyMediaService {
    const categoryServices = this.services.get(category) || [];
    if (serviceId) {
      const service = categoryServices.find((s) => s.id === serviceId);
      if (service) return service;
    }
    return categoryServices[0] || this.fallbackService;
  }

  /**
   * Get all services registered for a category.
   * Returns metadata usable by the client without importing service classes.
   */
  getServicesForCategory(category: BoardCategory): ServiceInfo[] {
    const categoryServices = this.services.get(category) || [];
    return categoryServices.map((s) => ({
      id: s.id,
      label: s.label,
      types: s.getSupportedTypes(),
    }));
  }
}

// Singleton instances
const registry = new MediaServiceRegistry();

/**
 * Factory to get the appropriate MediaService for a given board category.
 * @param category - The category of the board (music, cinema, etc.)
 * @param serviceId - Optional service ID to select a specific provider.
 * @returns The MediaService instance.
 */
export function getMediaService(
  category: BoardCategory = 'music',
  serviceId?: string,
): AnyMediaService {
  return registry.get(category, serviceId);
}

/**
 * Get all available services for a category.
 * Used by the client to populate service toggle UI.
 */
export function getServicesForCategory(category: BoardCategory): ServiceInfo[] {
  return registry.getServicesForCategory(category);
}

