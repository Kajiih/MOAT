# Media Type Abstraction - Implementation Plan

## ✅ Phase 1: Core Abstraction (COMPLETED)

Created the foundation:

- `lib/media-types/types.ts` - Core type definitions
- `lib/media-types/registry.ts` - Central registry class
- `lib/media-types/definitions/` - All media type definitions
- `lib/media-types/index.ts` - Entry point with all registrations

## 🔄 Phase 2: Refactor Services (NEXT)

### Goal

Simplify services to focus only on API communication, removing all type-specific configuration.

### Changes Required

#### 1. Update MediaService Interface

**File:** `lib/services/types.ts`

```typescript
export interface MediaService {
  readonly category: BoardCategory;

  search(
    query: string,
    type: MediaType,
    options: SearchOptions,
  ): Promise<SearchResult>;
  getDetails(id: string, type: MediaType): Promise<MediaDetails>;

  // REMOVE: getFilters(), getDefaultFilters(), getUIConfig()
  // These now come from the registry
}
```

#### 2. Refactor MusicService

**File:** `lib/services/music/MusicService.ts`

- Remove `getFilters()` method entirely
- Remove `getDefaultFilters()` method entirely
- Remove `getUIConfig()` method entirely
- Keep only `search()` and `getDetails()`
- Keep `parseSearchOptions()` for API-specific parsing

#### 3. Refactor TMDBService

**File:** `lib/services/cinema/TMDBService.ts`

- Same removals as MusicService
- Simplify to pure API adapter

#### 4. Refactor OpenLibraryService

**File:** `lib/services/books/OpenLibraryService.ts`

- Same removals as MusicService
- Simplify to pure API adapter

## 🔄 Phase 3: Update Consumers

### Goal

Update all components and hooks to use the registry instead of services for configuration.

### Changes Required

#### 1. Update SearchFilters Component

**File:** `components/search/filters/SearchFilters.tsx`

**Before:**

```typescript
const service = getMediaService(category);
const dynamicFilters = service.getFilters(type);
```

**After:**

```typescript
import { mediaTypeRegistry } from "@/lib/media-types";

const definition = mediaTypeRegistry.get(type);
const dynamicFilters = definition.filters;
```

#### 2. Update useMediaSearch Hook

**File:** `components/search/hooks/useMediaSearch.ts`

**Before:**

```typescript
const defaultState = // hardcoded values
```

**After:**

```typescript
import { mediaTypeRegistry } from "@/lib/media-types";

const getDefaultState = (type: MediaType) => {
  const defaults = mediaTypeRegistry.getDefaultFilters(type);
  return {
    ...defaults,
    page: 1,
  };
};
```

#### 3. Update MediaCard Component

**File:** `components/media/MediaCard.tsx`

**Before:**

```typescript
import { getMediaUI } from "@/lib/media-defs";
const uiConfig = getMediaUI(item.type);
```

**After:**

```typescript
import { mediaTypeRegistry } from "@/lib/media-types";
const definition = mediaTypeRegistry.get(item.type);
const { icon: Icon, colorClass, getSubtitle, getTertiaryText } = definition;
```

#### 4. Update SortDropdown Component

**File:** `components/ui/SortDropdown.tsx`

**Before:**

```typescript
// Hardcoded or service-provided sort options
const service = getMediaService(category);
const sortOptions = service
  .getFilters(type)
  .find((f) => f.id === "sort")?.options;
```

**After:**

```typescript
import { mediaTypeRegistry } from "@/lib/media-types";
const sortOptions = mediaTypeRegistry.getSortOptions(type);
```

#### 5. Update SearchPanel Component

**File:** `components/search/SearchPanel.tsx`

**Before:**

```typescript
const service = getMediaService(category);
const supportedTypes = service.getSupportedTypes();
```

**After:**

```typescript
import { mediaTypeRegistry } from "@/lib/media-types";
const supportedTypes = mediaTypeRegistry
  .getByCategory(category)
  .map((d) => d.id);
```

## 🔄 Phase 4: Cleanup

### Goal

Remove deprecated code and consolidate.

### Changes Required

#### 1. Deprecate/Remove Old File

**File:** `lib/media-defs.tsx`

This is now redundant as all UI config lives in the registry.

**Action:** Remove entirely, as all consumers will use the registry.

#### 2. Update Exports

Ensure `lib/media-types/index.ts` is the single entry point for all media type concerns.

## 📋 Testing Checklist

After each phase:

- [ ] Run `npm run lint` - Ensure no TypeScript errors
- [ ] Run `npm test` - Ensure all unit tests pass
- [ ] Run integration tests - Ensure E2E flows work
- [ ] Manual testing:
  - [ ] Search works for all types
  - [ ] Filters display correctly
  - [ ] Sort options work
  - [ ] Media cards display correctly
  - [ ] Details modal works

## 🎯 Benefits Realized

After completion:

1. **Single Source of Truth**: All media type config in one place
2. **Service Independence**: Same type works with different APIs
3. **Easier to Extend**: New type = one definition file
4. **Type Safety**: Full TypeScript validation
5. **Consistency**: Guaranteed consistency across similar types
6. **Maintainability**: Clear separation of concerns

## 📝 Migration Notes

- This is a breaking change but improves architecture significantly
- All changes are internal - no API changes exposed to users
- Can be done incrementally but better to complete in one go
- Estimated time: 2-3 hours for full migration

## 🚀 Next Steps

1. Start with Phase 2 - refactor services
2. Then Phase 3 - update consumers
3. Finally Phase 4 - cleanup
4. Full testing pass
5. Update architecture documentation
