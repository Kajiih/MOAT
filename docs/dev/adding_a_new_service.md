# Guide: Adding a New Service (Database V2)

This guide walks you through implementing a new data source using the V2 Database-Centric architecture.

## Overview

In V2, a "Service" is a `DatabaseProvider` that contains one or more `DatabaseEntity` objects. All logic—from API calls to UI branding—lives within the provider file.

## 1. Create the Provider File

Create a new file in `lib/services/`. Use the service name (e.g., `tmdb.ts`, `musicbrainz.ts`).

### Boilerplate

```typescript
import {
  DatabaseProvider,
  ProviderStatus,
  Fetcher,
} from "@/lib/database/types";
import { handleDatabaseError } from "@/lib/database/utils";

export class MyServiceDatabaseProvider implements DatabaseProvider {
  public id = "myservice";
  public label = "My Service";
  public status: ProviderStatus = ProviderStatus.IDLE;
  private fetcher!: Fetcher;

  public initialize = async (fetcher: Fetcher) => {
    this.fetcher = fetcher;
    // Perform any auth/setup here
  };

  public entities: DatabaseEntity[] = [
    // Entities go here
  ];
}

export const MyServiceDatabase = new MyServiceDatabaseProvider();
```

## 2. Define Entities using Factories

To avoid coupling logic to `this` and to prevent fragile lookups (like `this.entities[0]`), we recommend defining entities via **Factory Functions**. This pattern captures dependencies explicitly and makes the code easier to test.

```typescript
// 1. Define filters as standalone constants
const MOVIE_FILTERS: FilterDefinition[] = [
  { id: "year", label: "Year", type: "text", mapTo: "primary_release_year" },
];

// 2. Create a factory function that takes the provider instance
const createMovieEntity = (
  provider: MyServiceDatabaseProvider,
): DatabaseEntity => ({
  id: "movie",
  branding: {
    label: "Movie",
    labelPlural: "Movies",
    icon: Film,
    colorClass: "text-red-400",
  },
  filters: MOVIE_FILTERS,
  searchOptions: [],
  sortOptions: [
    { id: "relevance", label: "Relevance" },
    { id: "release_date", label: "Release Date", defaultDirection: "desc" },
  ],
  search: async (params) => {
    try {
      const apiParams: Record<string, string> = { query: params.query };

      // Use the captured MOVIE_FILTERS directly
      applyFilters(apiParams, params.filters, MOVIE_FILTERS);

      // Call methods on the passed provider instance, passing the signal
      const data = await provider.fetchApi("/search/movie", apiParams, {
        signal: params.signal,
      });
      // ... map results ...
    } catch (error) {
      throw handleDatabaseError(error, provider.id);
    }
  },
  getDetails: (dbId, options) =>
    provider.fetchApi(`/movie/${dbId}`, {}, { signal: options?.signal }),
});

// 3. In your class, initialize entities using the factories
export class MyServiceDatabaseProvider implements DatabaseProvider {
  // ...
  public entities: DatabaseEntity[] = [
    createMovieEntity(this),
    createOtherEntity(this),
  ];
}
```

## 3. Implement Search & Filtering

Use the `applyFilters` utility to map UI filters to API parameters automatically.

```typescript
import { applyFilters } from "@/lib/database/utils";

// Inside search:
const apiParams: Record<string, string> = {
  query: params.query,
  page: params.page?.toString() || "1",
};

// Map filters and search options
applyFilters(apiParams, params.filters, entity.filters);
applyFilters(apiParams, params.filters, entity.searchOptions);

const data = await this.fetcher<MyApiResult>(url, {
  signal: params.signal,
  params: apiParams,
});
```

### Filter Definitions

Each filter can have a `mapTo` key and an optional `transform` function.

```typescript
{
  id: 'year',
  label: 'Year',
  type: 'text',
  mapTo: 'primary_release_year',
}
```

## 4. Map to `Item`

The `search` method must return `Item` objects validated by Zod.

```typescript
import { ItemSchema, toCompositeId, urlImage } from "@/lib/database/types";

const items = data.results.map((raw) => {
  const identity = {
    dbId: raw.id.toString(),
    databaseId: "myservice",
    entityId: "movie",
  };

  const item = {
    id: toCompositeId(identity),
    identity,
    title: raw.title,
    images: [urlImage(raw.poster_path)],
    subtitle: raw.release_date?.split("-")[0],
    rating: raw.vote_average * 10, // Normalize to 0-100
  };

  return ItemSchema.parse(item);
});
```

## 5. Implement Details

The `getDetails` method returns deep metadata.

```typescript
getDetails: async (dbId: string): Promise<ItemDetails> => {
  try {
    const raw = await this.fetcher<MyApiDetails>(`/movie/${dbId}`);

    const details = {
      // Item fields...
      description: raw.overview,
      tags: raw.genres.map((g) => g.name),
      externalLinks: [{ label: "Official", url: raw.homepage }],
      extendedData: {
        budget: raw.budget,
        revenue: raw.revenue,
      },
    };

    return ItemDetailsSchema.parse(details);
  } catch (error) {
    throw handleDatabaseError(error, this.id);
  }
};
```

## 6. Register the Provider

Add your provider to the `providers` array in `lib/database/providers.ts` — this is the single manifest of all database providers:

```typescript
// lib/database/providers.ts
import { MyServiceDatabase } from "../services/myservice";

const providers: DatabaseProvider[] = [
  RAWGDatabase,
  MyServiceDatabase, // ← add your provider here
];
```

The registry will automatically bootstrap all listed providers when the module is first imported.

## Best Practices

1. **Locality**: Keep API types and mapping logic inside the provider file.
2. **Standardization**: Prefer `subtitle` and `tertiaryText` for secondary info rather than custom fields.
3. **Validation**: Always use `Schema.parse()` to ensure data integrity.
4. **Error Handling**: Wrap `search` and `getDetails` in `try/catch` and use `handleDatabaseError(error, this.id)`.
