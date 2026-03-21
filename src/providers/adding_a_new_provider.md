# Guide: Adding a New Provider (V3 Architecture)

This guide walks you through implementing a new data source using the V3 Provider architecture.

## Overview

A **Provider** is an independent service (e.g., `RAWGProvider`, `MusicBrainzProvider`) that exposes one or more **Entity** objects (e.g., `Game`, `Album`).
All logic—from API calls to UI branding and automated test triggers—lives encapsulated within the provider adapter.

---

## 1. Create the Provider File

Create a new file in `src/providers/adapters/`. Use the service name (e.g., `tmdb.ts`, `musicbrainz.ts`).

### Boilerplate

```typescript
import { LucideIcon } from "lucide-react";
import { Provider, Entity, ProviderStatus, Fetcher } from "../types";
import { secureFetch } from "../api-client";

export class MyServiceProvider implements Provider {
  public id = "myservice";
  public label = "My Service";
  public status: ProviderStatus = ProviderStatus.IDLE;
  private fetcher: Fetcher = secureFetch;

  public initialize = async (fetcher: Fetcher) => {
    this.fetcher = fetcher;
  };

  public entities = [new MyEntity(this)] as const;
}
```

---

## 2. Implement the `Entity` Interface

An `Entity` models a searchable node (e.g., `Movie`, `Artist`).

### Filters and Sorts Configuration

Use the Curried Suite Factory Pattern `createFilterSuite<TRaw>()` to maintain strict typing against your API response shape (`TRaw`).

```typescript
import { createFilterSuite, mapTo } from "@/search/filter-schemas";

const myFilters = createFilterSuite<MyRawItemType>();

const FILTERS: FilterDefinition<MyRawItemType>[] = [
  myFilters.select({
    id: "category",
    label: "Category",
    defaultValue: "all", // Single source of Truth for defaults!
    transform: mapTo("type"),
    options: [
      { label: "All", value: "all" },
      { label: "Standard", value: "std" },
    ],
  }),
];

const SEARCH_OPTIONS: FilterDefinition<MyRawItemType>[] = [
  // Guidelines: ALWAYS implement a fuzzy toggle if the upstream API supports it
  myFilters.boolean({
    id: "precise",
    label: "Precise Search",
    defaultValue: true,
    transform: mapTo("search_precise"),
    helperText: "Disable fuzzy matching for exact results",
  }),
];
```

### Entity Blueprint

```typescript
export class MyEntity implements Entity<MyRawItemType> {
  public readonly id = "my_entity";

  public readonly branding = {
    label: "Item",
    labelPlural: "Items",
    icon: Film, // Lucide icon
    colorClass: "text-red-400",
  };

  public readonly filters = FILTERS;
  public readonly searchOptions = SEARCH_OPTIONS;

  public readonly sortOptions = [
    { id: "relevance", label: "Relevance" },
    { id: "date", label: "Release Date", defaultDirection: SortDirection.DESC },
  ];

  // --- Automated Test Setup (Mandatory) ---
  public readonly edgeShortQuery = "zzzzzz"; // Trigger 1-3 results
  public readonly defaultTestQueries = nonEmpty("Query A", "Query B");
  public readonly testDetailsIds = nonEmpty("id_1", "id_2");

  public constructor(private provider: MyServiceProvider) {}

  public readonly getInitialParams = (config: {
    limit: number;
  }): SearchParams => ({
    query: "",
    filters: {}, // Defaults are applied automatically via applyFilters
    sort: this.sortOptions[0]?.id,
    limit: config.limit,
  });

  public readonly search = async (
    params: SearchParams,
  ): Promise<SearchResult<MyRawItemType>> => {
    // 1. applyFilters fallback logic combines state and declarative defaultValue
    const apiParams = {
      ...applyFilters(params.filters, [...FILTERS, ...SEARCH_OPTIONS]),
    };
    // 2. Fetch and map to standard Moat `Item`
  };
}
```

---

## Automated Test Cases

Entities expose configuration targeting **integration verification natively**:

1.  **`defaultTestQueries`**: Feeds high-volume testing to ensure pagination builds valid bounds.
2.  **`testDetailsIds`**: Feeds `getDetails()` to verify schema validation doesn't crash on incomplete API edge variables.
3.  **Filter Tests (`testCases`)**: Inside `FilterDefinition`, feed automated assertion blocks:
    ```typescript
    testCases: [
      {
        value: "album",
        expectAll: (item: TRaw) => item.type === "album", // Native callback assertion
      },
    ];
    ```

---

## What to Test Manually (UI Checklist)

Automated tests cover endpoints and schemas. Developers must verify the **User Experience** before pushing:

- **Detail Hydration**: Open any item card; do descriptions, URLs, and subtitles render with safe defaults, avoiding `null` texts?
- **Sort Shifts**: Update sorting triggers correctly. Does adding a sort state fire immediate hydration loaders natively?
- **Async Click Modifier**: Ensure any Async Select component re-populates the input correctly upon clicking to facilitate modifier lookups.
