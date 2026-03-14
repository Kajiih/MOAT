# `/providers` - The Generic Provider Architecture

Moat interfaces with live APIs (currently implementing RAWG for Video Games) through a generic, strictly-typed **Provider System**. This domain contains all integration layers for fetching, mapping, and normalizing external endpoints into agnostic Moat `Item` types natively.

## Generic Typing Architecture (`TRaw`)

Providers rely entirely on a single-variable constraint model (`TRaw`) representing the exact, raw JSON schema returned by the upstream endpoint.

```typescript
// Example: The RAWG API returns an object array shaped like RAWGGame.
// The filter simply enforces that all test matching behaves against that shape.
const GAME_FILTERS: FilterDefinition<RAWGGame>[] = [
  rawgGameFilters.range({
    id: "yearRange",
    label: "Release Year",
    mapTo: "dates", // The API param it targets internally
    transform: (val: { min?: string; max?: string }) => "YYYY-YYY", // Normalizes into specific patterns
    testCases: [
      {
        value: { min: "2020", max: "2022" },
        match: (item: RAWGGame) => Number.parseInt(item.released) >= 2020, // Strictly typed Native Checks
      },
    ],
  }),
];
```

To create filter definitions for a specific API response shape, use the **Curried Suite Factory Pattern** (`createFilterSuite<TRaw>()`).

```typescript
// Defines a fully-typed closure builder instantly locked purely to the TRaw standard mapping.
const rawgDeveloperFilters = createFilterSuite<RAWGDeveloper>();
```

## Unified Payload Safeties (Zod)

The Provider Layer places a hard Zod validation barrier at **both** ends of the pipeline in all native adapters (`adapters/`):

1. `search()` payload results are strictly parsed before being evaluated.
2. `getDetails()` blocks are strictly parsed by a custom Zod schema before the registry coerces them into abstract generic `ItemDetails` shapes for the React UI.

If an API radically alters its detailed node structure, the data fails the boundary parse in `adapter.ts`, safely throwing a `ProviderError`.

## Adding a New Provider Adapter

1. Build a new folder entirely localized within `/adapters` outlining strict Domain/Entity Zod typing boundaries.
2. Ensure you invoke `secureFetch` to wrap native backend connection endpoints natively against 503/429 crashes, rather than naive global `fetch` calls.
3. Import the fully functional Provider directly into the singleton `src/providers/registry.ts` file, where it will instantly load and mount safely through `useRegistry()` without touching internal React code limits.
