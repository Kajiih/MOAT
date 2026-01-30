/**
 * @file media-types/registry.ts
 * @description Central registry for all media type definitions.
 * Provides a single point of access for all media type configuration.
 */

import { BoardCategory, MediaType } from '@/lib/types';

import { CategoryConfig, FilterConfig, MediaTypeDefinition, SortOptionConfig } from './types';

/**
 * Central registry for media type definitions.
 * Singleton pattern - use the exported instance.
 */
export class MediaTypeRegistry {
  private definitions = new Map<MediaType, MediaTypeDefinition>();
  private categories = new Map<BoardCategory, CategoryConfig>();
  
  /**
   * Register a media type definition.
   * @param definition - The media type definition to register.
   */
  register(definition: MediaTypeDefinition): void {
    this.definitions.set(definition.id, definition);
  }
  
  /**
   * Register multiple definitions at once.
   * @param definitions - Array of media type definitions to register.
   */
  registerMany(definitions: MediaTypeDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }
  
  /**
   * Register a category configuration.
   * @param config - The category configuration object.
   */
  registerCategory(config: CategoryConfig): void {
    this.categories.set(config.id, config);
  }
  
  /**
   * Get a media type definition by ID.
   * @param type - The media type identifier.
   * @returns The media type definition.
   * @throws {Error} if type is not registered
   */
  get(type: MediaType): MediaTypeDefinition {
    const def = this.definitions.get(type);
    if (!def) {
      throw new Error(`Media type "${type}" is not registered`);
    }
    return def;
  }
  
  /**
   * Get all media types for a category.
   * @param category - The board category.
   * @returns Array of media type definitions for the category.
   */
  getByCategory(category: BoardCategory): MediaTypeDefinition[] {
    return [...this.definitions.values()]
      .filter(def => def.category === category);
  }
  
  /**
   * Get category configuration.
   * @param category - The board category.
   * @returns The category configuration or undefined if not found.
   */
  getCategory(category: BoardCategory): CategoryConfig | undefined {
    return this.categories.get(category);
  }
  
  /**
   * Get a specific filter config by ID.
   * @param type - The media type identifier.
   * @param filterId - The ID of the filter to retrieve.
   * @returns The filter configuration or undefined if not found.
   */
  getFilter(type: MediaType, filterId: string): FilterConfig | undefined {
    return this.get(type).filters.find(f => f.id === filterId);
  }
  
  /**
   * Get all sort options for a type.
   * @param type - The media type identifier.
   * @returns Array of sort option configurations.
   */
  getSortOptions(type: MediaType): SortOptionConfig[] {
    return this.get(type).sortOptions;
  }
  
  /**
   * Get default filter values for a type.
   * @param type - The media type identifier.
   * @returns Object containing default filter values.
   */
  getDefaultFilters(type: MediaType): Record<string, unknown> {
    return { ...this.get(type).defaultFilters };
  }
  
  /**
   * Check if a type is registered.
   * @param type - The media type identifier.
   * @returns True if the type is registered, false otherwise.
   */
  has(type: MediaType): boolean {
    return this.definitions.has(type);
  }
  
  /**
   * Get all registered type IDs.
   * @returns Array of formatted media type IDs.
   */
  getAllTypes(): MediaType[] {
    return [...this.definitions.keys()];
  }
  
  /**
   * Get all registered types as definitions.
   * @returns Array of all media type definitions.
   */
  getAllDefinitions(): MediaTypeDefinition[] {
    return [...this.definitions.values()];
  }
}

/**
 * Global registry instance.
 * Import and use this throughout the application.
 */
export const mediaTypeRegistry = new MediaTypeRegistry();
