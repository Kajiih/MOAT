# Media Type Abstraction Proposal

## Problem Statement

Currently, media type configuration is scattered across multiple locations:
- UI config (icons, colors, labels) in `lib/media-defs.tsx`
- Filter definitions in each service's `getFilters()` method
- Default filter values in each service's `getDefaultFilters()` method
- Sort options embedded within filter definitions
- API-specific logic mixed with type-specific logic

This creates:
- **Duplication**: Similar logic repeated across services
- **Tight coupling**: Services handle both API communication AND type configuration
- **Hard to extend**: Adding a new media type requires changes in multiple files
- **Inconsistency**: No guarantee that similar types (e.g., artist/author) use similar patterns

## Proposed Solution

Create a comprehensive `MediaTypeDefinition` abstraction that encapsulates everything about a specific media type.

### Core Architecture

```typescript
/**
 * Complete definition of a media type, independent of the backing service.
 */
interface MediaTypeDefinition {
  // Identity
  id: MediaType;
  category: BoardCategory;
  
  // UI Presentation
  label: string;
  labelPlural: string;
  icon: LucideIcon;
  colorClass: string;
  
  // Display formatters
  getSubtitle: (item: MediaItem) => string;
  getTertiaryText: (item: MediaItem) => string;
  
  // Search & Filters
  filters: FilterConfig[];
  sortOptions: SortOptionConfig[];
  defaultFilters: Record<string, unknown>;
  
  // API Integration
  searchable: boolean;
  supportsDetails: boolean;
  
  // Optional: Type-specific behavior
  customBehavior?: {
    // e.g., for albums - validate that artist is set
    validateBeforeAdd?: (item: MediaItem) => boolean;
  };
}

/**
 * Filter configuration with clearer separation of concerns.
 */
interface FilterConfig {
  id: string;
  label: string;
  type: FilterType;
  
  // URL mapping
  paramName?: string; // defaults to id
  
  // UI hints
  placeholder?: string;
  helperText?: string;
  
  // For select/picker/toggle types
  options?: FilterOption[];
  pickerType?: MediaType;
  
  // Default value
  defaultValue?: unknown;
  
  // Validation
  validate?: (value: unknown) => boolean;
}

/**
 * Sort option configuration (extracted from filters).
 */
interface SortOptionConfig {
  value: SortOption;
  label: string;
  apiMapping?: string; // For services that use different parameter values
}
```

### Registry Pattern

```typescript
/**
 * Central registry of all media type definitions.
 */
class MediaTypeRegistry {
  private definitions = new Map<MediaType, MediaTypeDefinition>();
  
  register(definition: MediaTypeDefinition): void {
    this.definitions.set(definition.id, definition);
  }
  
  get(type: MediaType): MediaTypeDefinition {
    const def = this.definitions.get(type);
    if (!def) throw new Error(`Unknown media type: ${type}`);
    return def;
  }
  
  getByCategory(category: BoardCategory): MediaTypeDefinition[] {
    return Array.from(this.definitions.values())
      .filter(def => def.category === category);
  }
  
  getFilterById(type: MediaType, filterId: string): FilterConfig | undefined {
    return this.get(type).filters.find(f => f.id === filterId);
  }
  
  getSortOptions(type: MediaType): SortOptionConfig[] {
    return this.get(type).sortOptions;
  }
}

// Global registry instance
export const mediaTypeRegistry = new MediaTypeRegistry();
```

### Service Simplification

Services become purely about API communication:

```typescript
/**
 * Simplified service interface - focused only on data fetching.
 */
interface MediaService {
  /**
   * The category this service handles.
   */
  readonly category: BoardCategory;
  
  /**
   * Search for items of a specific type.
   */
  search(
    query: string, 
    type: MediaType, 
    options: SearchOptions
  ): Promise<SearchResult>;
  
  /**
   * Get detailed information for an item.
   */
  getDetails(id: string, type: MediaType): Promise<MediaDetails>;
  
  /**
   * Map generic sort/filter values to API-specific parameters.
   * This is the only place where API-specific logic lives.
   */
  mapSearchOptions(
    type: MediaType, 
    options: SearchOptions
  ): Record<string, unknown>;
}
```

### Example Definition

```typescript
// lib/media-types/definitions/album.ts
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
      label: 'Filter by Artist',
      type: 'picker',
      pickerType: 'artist',
      paramName: 'artistId',
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
    albumPrimaryTypes: ['Album', 'EP'],
    sort: 'relevance',
  },
  
  searchable: true,
  supportsDetails: true,
};
```

## Benefits

### 1. **Single Source of Truth**
All information about a media type lives in one place.

### 2. **Service Independence**
The same type definition works across different services (e.g., MusicBrainz vs Spotify for albums).

### 3. **Easier Testing**
Type definitions can be tested independently of services.

### 4. **Consistency**
Similar types (artist/author, movie/tv) can share base configurations.

### 5. **Extensibility**
Adding a new type means creating one definition file and registering it.

### 6. **Type Safety**
TypeScript can validate definitions at compile time.

### 7. **Decoupling**
UI components get configuration from the registry, not from services.

## Migration Path

### Phase 1: Create Abstractions (Non-Breaking)
1. Create `MediaTypeDefinition` interface
2. Create `MediaTypeRegistry` class
3. Create definition files for existing types
4. Register all definitions

### Phase 2: Migrate Consumers (Gradual)
1. Update `SearchFilters` to use registry instead of service
2. Update `useMediaSearch` to get defaults from registry
3. Update UI components to use registry for display config

### Phase 3: Simplify Services (Breaking)
1. Remove `getFilters()`, `getDefaultFilters()`, `getUIConfig()` from services
2. Services focus only on API communication
3. Clean up duplication

### Phase 4: Enhance (Future)
1. Add validation to definitions
2. Add type-specific behavior hooks
3. Support service-specific sort mappings

## File Structure

```
lib/
  media-types/
    registry.ts           # MediaTypeRegistry class
    types.ts              # MediaTypeDefinition interfaces
    definitions/
      music/
        artist.ts
        album.ts
        song.ts
      cinema/
        movie.ts
        tv.ts
        person.ts
      books/
        book.ts
        author.ts
    index.ts              # Exports configured registry
```

## Open Questions

1. **Sort mapping**: Should services provide mapping for sort options, or should definitions include API-specific mappings?
2. **Filter dependencies**: How to handle filters that depend on each other (e.g., album picker depends on selected artist)?
3. **Dynamic filters**: Some services might support filters that others don't. How to handle this?
4. **Validation**: Should validation be in definitions or remain in components?

## Recommendation

**Phase 1 implementation** is recommended as the first step. This creates the foundation without breaking existing code, allowing for gradual migration and validation of the design.
