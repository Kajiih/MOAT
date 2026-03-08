# The Provider System Architecture

Moat interfaces with live APIs (RAWG, MusicBrainz) through a generic, strictly-typed **Provider System** (`src/providers/`). 

## Generic Typing Architecture (`TRaw`)

Providers rely entirely on a single-variable constraint model (`TRaw`) representing the exact, raw JSON schema returned by the upstream endpoint. 

```typescript
// Example: The RAWG API returns an object array shaped like RAWGGame.
// The filter simply enforces that all test matching behaves against that shape.
const GAME_FILTERS: FilterDefinition<RAWGGame>[] = [
  rawgGameFilters.range({
    id: 'yearRange',
    label: 'Release Year',
    mapTo: 'dates', // The API param it targets internally
    transform: (val: { min?: string; max?: string }) => 'YYYY-YYY', // Normalizes into specific string patterns
    testCases: [
      {
        value: { min: '2020', max: '2022' },
        match: (item: RAWGGame) => Number.parseInt(item.released) >= 2020 // Strictly typed against upstream format
      }
    ]
  }),
]
```

To create filter definitions for a specific API response shape, use the **Curried Suite Factory Pattern** (`createFilterSuite<TRaw>()`). 

```typescript
// Defines a fully-typed closure builder instantly locked purely to the TRaw standard mapping.
const rawgDeveloperFilters = createFilterSuite<RAWGDeveloper>();
```

## Unified Payload Safeties (Zod)

Moat places a hard Zod validation barrier at **both** ends of the pipeline in all adapters:
1. `search()` payload results are strictly parsed before being evaluated.
2. `getDetails()` blocks are strictly parsed by a Zod schema before the registry coerces them into abstract generic `ItemDetails` shapes for the React UI.

If an API radically alters its detailed node structure, the data fails the boundary parse in `adapter.ts`, safely throwing a `ProviderError`. 

## Reactivity (`useRegistry()`)

The Database Registry `src/providers/registry.ts` is framework agnostic. To transport it into React securely:
- Providers asynchronous authentication uses `subscribe()` and `notify()`.
- `SearchPanel.tsx` and the UI shell attach to this tree using a customized `useSyncExternalStore` Hook natively mounted via `useRegistry()`.
- The user interface guarantees zero flash state errors by resolving through `INITIALIZING` -> `READY` / `ERROR`.
