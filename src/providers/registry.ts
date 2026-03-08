import { secureFetch } from '@/providers/api-client';
import { Entity, Provider, Fetcher, ProviderStatus } from '@/providers/types';

/**
 * Possible states for the DatabaseRegistry.
 */
export enum RegistryStatus {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  ERROR = 'ERROR'
}

/**
 * Registry for managing external database providers.
 * Singleton pattern.
 */
export class DatabaseRegistry {
  private static instance: DatabaseRegistry;
  private providers: Map<string, Provider> = new Map();
  private fetcher: Fetcher = secureFetch as unknown as Fetcher;
  
  private status: RegistryStatus = RegistryStatus.IDLE;
  private pendingRegistrations: Set<Promise<void>> = new Set();

  private constructor() {}

  public static getInstance(): DatabaseRegistry {
    if (!DatabaseRegistry.instance) {
      DatabaseRegistry.instance = new DatabaseRegistry();
    }
    return DatabaseRegistry.instance;
  }

  /**
   * Returns the current status of the registry.
   */
  public getStatus(): RegistryStatus {
    return this.status;
  }

  /**
   * Awaits all currently pending provider initializations.
   * If new registrations start while waiting, it will continue to wait until all are complete.
   */
  public async waitUntilReady(): Promise<void> {
    while (this.pendingRegistrations.size > 0) {
      await Promise.all(this.pendingRegistrations);
    }
  }

  /**
   * Sets a custom fetcher for all providers (useful for testing).
   * @param fetcher
   */
  public setFetcher(fetcher: Fetcher): void {
    this.fetcher = fetcher;
  }

  /**
   * Registers and initializes a new database provider.
   * @param provider
   */
  public async register(provider: Provider): Promise<void> {
    this.status = RegistryStatus.INITIALIZING;
    provider.status = ProviderStatus.INITIALIZING;
    
    // Always add the provider to the map so its status can be tracked by UI
    this.providers.set(provider.id, provider);

    const registration = (async () => {
      try {
        if (provider.initialize) {
          await provider.initialize(this.fetcher);
        }
        provider.status = ProviderStatus.READY;
      } catch (error) {
        provider.status = ProviderStatus.ERROR;
        console.error(`Failed to initialize provider "${provider.id}":`, error);
        throw error;
      }
    })();

    this.pendingRegistrations.add(registration);
    
    try {
      await registration;
    } finally {
      this.pendingRegistrations.delete(registration);
      
      // Only finalize status if no other registrations are pending 
      if (this.pendingRegistrations.size === 0) {
        const allProviders = [...this.providers.values()];
        const hasReady = allProviders.some(p => p.status === ProviderStatus.READY);
        const hasProviders = allProviders.length > 0;
        
        // Let the registry be READY if at least one provider is functioning,
        // or if there are no providers (so it's not stuck in ERROR).
        // Only set ERROR if there are providers and *none* of them are READY.
        if (hasProviders && !hasReady) {
          this.status = RegistryStatus.ERROR;
        } else {
          this.status = RegistryStatus.READY;
        }
      }
    }
  }

  /**
   * Retrieves a provider by id.
   * @param id - The provider's unique identifier.
   * @throws If provider is not found.
   */
  public getProvider(id: string): Provider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Provider "${id}" not found`);
    return provider;
  }

  /**
   * Retrieves a specific entity from a specific database provider.
   * @param databaseId - The provider's unique identifier.
   * @param entityId - The entity's unique identifier within the provider.
   * @throws If provider or entity is not found.
   */
  public getEntity(databaseId: string, entityId: string): Entity {
    const provider = this.getProvider(databaseId);
    const entity = provider.entities.find(e => e.id === entityId);
    if (!entity) throw new Error(`Entity "${entityId}" not found in provider "${databaseId}"`);
    return entity;
  }

  /**
   * Resolves an image reference key globally via the correct provider.
   * @param providerId
   * @param key
   */
  public async resolveImageReference(providerId: string, key: string): Promise<string | null> {
    await this.waitUntilReady();
    const provider = this.getProvider(providerId);

    // If we get an auth error during resolution, we might want to try to recover
    try {
      if (provider.resolveImage) {
        return await provider.resolveImage(key);
      }
    } catch (error) {
      const dbError = import('./utils').then(m => m.handleProviderError(error, providerId));
      // In a real app, we'd check if this is an AUTH_ERROR and trigger re-init
      // For now, we just log and return null
      console.error(`Image resolution failed for ${providerId}:${key}`, error);
    }
    return null;
  }

  /**
   * Triggers a manual or automatic re-initialization of a provider.
   * Useful when a provider's credentials expire at runtime.
   * @param providerId
   */
  public async reinitializeProvider(providerId: string): Promise<void> {
    const provider = this.getProvider(providerId);
    console.log(`Re-initializing provider "${providerId}"...`);
    await this.register(provider);
  }

  /**
   * Returns all registered providers.
   */
  public getAllProviders(): Provider[] {
    return [...this.providers.values()];
  }

  /**
   * Resets the registry (primarily for testing).
   */
  public clear(): void {
    this.providers.clear();
    this.status = RegistryStatus.IDLE;
    this.pendingRegistrations.clear();
  }
}

export const registry = DatabaseRegistry.getInstance();

