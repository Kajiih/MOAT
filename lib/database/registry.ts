import { secureFetch } from '../services/shared/api-client';
import { DatabaseProvider, Fetcher, ProviderStatus } from './types';

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
  private providers: Map<string, DatabaseProvider> = new Map();
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
      await Promise.all(Array.from(this.pendingRegistrations));
    }
  }

  /**
   * Sets a custom fetcher for all providers (useful for testing).
   */
  public setFetcher(fetcher: Fetcher): void {
    this.fetcher = fetcher;
  }

  /**
   * Registers and initializes a new database provider.
   */
  public async register(provider: DatabaseProvider): Promise<void> {
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
        const allProviders = Array.from(this.providers.values());
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
   */
  public getProvider(id: string): DatabaseProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Resolves an image reference key globally via the correct provider.
   */
  public async resolveImageReference(providerId: string, key: string): Promise<string | null> {
    await this.waitUntilReady();
    const provider = this.getProvider(providerId);
    if (provider && provider.resolveImage) {
      return provider.resolveImage(key);
    }
    return null;
  }

  /**
   * Returns all registered providers.
   */
  public getAllProviders(): DatabaseProvider[] {
    return Array.from(this.providers.values());
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
