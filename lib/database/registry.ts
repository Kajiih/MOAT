import { secureFetch } from '../services/shared/api-client';
import { DatabaseProvider, Fetcher } from './types';

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
   */
  public async waitUntilReady(): Promise<void> {
    if (this.pendingRegistrations.size === 0) return;
    await Promise.all(Array.from(this.pendingRegistrations));
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

    const registration = (async () => {
      try {
        if (provider.initialize) {
          await provider.initialize(this.fetcher);
        }
        this.providers.set(provider.id, provider);
      } catch (error) {
        this.status = RegistryStatus.ERROR;
        console.error(`Failed to initialize provider "${provider.id}":`, error);
        throw error;
      }
    })();

    this.pendingRegistrations.add(registration);
    
    try {
      await registration;
    } finally {
      this.pendingRegistrations.delete(registration);
      // Only set to READY if no other registrations are pending and we aren't in ERROR state
      if (this.pendingRegistrations.size === 0 && (this.status as string) !== RegistryStatus.ERROR) {
        this.status = RegistryStatus.READY;
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
  }
}

export const registry = DatabaseRegistry.getInstance();
