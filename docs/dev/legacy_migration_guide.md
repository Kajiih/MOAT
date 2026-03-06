# Guide: Migrating V1 Services to V2

This document outlines the patterns and steps for porting legacy services from `v1/lib/services/` to the new V2 `DatabaseProvider` architecture in `lib/services/v2/`.

## Why Migrate?

- **Unified Data Model**: All services now return `Item`, eliminating the need for complex type branching in the UI.
- **Native Context**: V2 providers encapsulate their own branding, filters, and detail resolution logic.
- **Improved Performance**: Direct resolution and standardized caching/cancellation.

## Mapping Patterns

### 1. Identify Entity Types
In V1, a service often handled multiple media types (e.g., `MusicService` handled `album`, `artist`, `song`). In V2, these should be separate `DatabaseEntity` objects within a single `DatabaseProvider`.

### 2. Parameter Mapping
Map V1 `SearchOptions` to V2 `SearchParams`.

| V1 Option | V2 SearchParam | Notes |
|-----------|----------------|-------|
| `page` | `page` | Standard |
| `filters` | `filters` | Use `applyFilters` utility |
| `sort` | `sort` | Map to V2 `SortOption` |

### 3. Response Mapping
Convert V1 `BaseMediaItem` to V2 `Item`.

| V1 Field | V2 Field | Notes |
|----------|----------|-------|
| `id` | `identity.dbId` | Local ID from the API |
| `mbid` | `extendedData.mbid` | Store as metadata if needed |
| `type` | `identity.entityId` | e.g. 'album', 'movie' |
| `imageUrl`| `images` | Use `urlImage()` or `referenceImage()` |
| `artist` | `subtitle` | Generalize to subtitle |
| `year` | `subtertText` | or `tertiaryText` |

### 4. Detail Resolution
Legacy services often fetched details during search. V2 separates these into `search()` (shallow) and `getDetails()` (deep).

## Implementation Checklist

1. [ ] Create `lib/services/v2/<service>.ts`.
2. [ ] Define entities using `createEntity` factory pattern.
3. [ ] Implement `search()` method and map results to `ItemSchema`.
4. [ ] Implement `getDetails()` method and map results to `ItemDetailsSchema`.
5. [ ] Register the provider in `lib/database/registry.ts`.
6. [ ] Verify results in `SearchPanelV2`.
