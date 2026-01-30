# Extending Media Types and Services

This guide explains how to extend the application by adding new media types (e.g., Video Games, Podcasts) or connecting to new data sources (e.g., IGDB, Spotify).

The architecture separates **What** we display (Registry) from **How** we fetch it (Services).

---

## 1. Adding a New Media Type

If you want to support a new type of item (e.g., "Video Game"), you need to define its characteristics and UI configuration.

### Step 1: Create a Definition File

Create a new file in `lib/media-types/definitions/`, for example `games.ts`.

```typescript
import { Gamepad2, User } from "lucide-react";
import { MediaTypeDefinition } from "../types";

export const gameDefinitions: MediaTypeDefinition[] = [
  {
    id: "game", // Unique ID (MediaType)
    category: "game", // The board category (BoardCategory)
    label: "Video Game", // Display label
    labelPlural: "Video Games",

    // UI Configuration
    icon: Gamepad2, // Lucide Icon
    colorClass: "text-purple-400", // Tailwind color class for icons

    // Subtitle Formatter (e.g., "Nintendo • 2024")
    getSubtitle: (item) => [item.author, item.year].filter(Boolean).join(" • "),
    getTertiaryText: (item) => item.details?.genres?.join(", "),

    // Filters to appear in Search Panel
    filters: [
      {
        id: "platform",
        type: "select",
        label: "Platform",
        options: [
          { label: "PC", value: "pc" },
          { label: "PS5", value: "ps5" },
        ],
      },
      {
        id: "yearRange",
        type: "range",
        label: "Release Year",
        defaultValue: { min: 1980, max: 2025 },
      },
    ],

    // Sorting Options
    sortOptions: [
      { value: "relevance", label: "Relevance" },
      { value: "rating_desc", label: "Rating" },
      { value: "date_desc", label: "Release Date" },
    ],

    // Default Filter Values
    defaultFilters: {
      sort: "relevance",
      platform: "",
    },

    searchable: true,
    supportsDetails: true,
  },
];
```

### Step 2: Register the Definition

Open `lib/media-types/index.ts` and add your new definition to the registry.

```typescript
import { gameDefinitions } from "./definitions/games";

// ...
mediaTypeRegistry.registerMany(gameDefinitions);

// Also register the category config if it's a new category
mediaTypeRegistry.registerCategory({
  id: "game",
  label: "Games",
  labelPlural: "Games",
  primaryTypes: ["game"],
  secondaryTypes: [],
});
```

---

## 2. Adding a New Service (Database)

If you need to fetch data from a new API (e.g., IGDB), you need to create a Service Adapter.

### Step 1: Create the Service Class

Create a new directory `lib/services/games/` and a file `IGDBService.ts`. Your service must implement the `MediaService` interface.

```typescript
import { MediaService } from "../types";
import { MediaItem, SearchResult, MediaType, SearchOptions } from "@/lib/types";

export class IGDBService implements MediaService {
  readonly category = "game";

  // 1. Return the types this service supports
  getSupportedTypes(): MediaType[] {
    return ["game"];
  }

  // 2. Implement Search
  async search(
    query: string,
    type: MediaType,
    options?: SearchOptions,
  ): Promise<SearchResult> {
    // Call external API
    const response = await fetch(
      `https://api.igdb.com/games?search=${query}...`,
    );
    const data = await response.json();

    // Map to internal MediaItem format
    const items = data.map((game) => ({
      id: game.id.toString(),
      type: "game",
      title: game.name,
      year: game.release_date,
      // ...
    }));

    return {
      results: items,
      page: options?.page || 1,
      totalPages: 10, // Calculate based on API response
    };
  }

  // 3. Implement Details Fetching
  async getDetails(id: string, type: MediaType): Promise<MediaDetails> {
    // Fetch deep details (description, genres, specific metadata)
    // ...
  }
}
```

### Step 2: Test your Service

We use a **Fake Server** pattern with **MSW**. Never mock internal functions of your service; instead, simulate the API it talks to.

#### 1. Create Mock Handlers

Create `lib/services/games/mocks/handlers.ts`. Define a `fakeDb` and handlers that parse query parameters.

```typescript
import { http, HttpResponse } from "msw";

const BASE_URL = "https://api.igdb.com";

export const handlers = [
  http.get(`${BASE_URL}/games`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase() || "";

    const fakeGames = [{ id: "1", name: "Zelda" }];
    const matches = fakeGames.filter((g) =>
      g.name.toLowerCase().includes(search),
    );

    return HttpResponse.json(matches);
  }),
];
```

#### 2. Create the Test Suite

Create `lib/services/games/IGDBService.test.ts`.

```typescript
import { setupServer } from "msw/node";
import { handlers } from "./mocks/handlers";
import { IGDBService } from "./IGDBService";

const server = setupServer(...handlers);

describe("IGDBService Integration", () => {
  const service = new IGDBService();

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should find games by search query", async () => {
    const result = await service.search("Zelda", "game");
    expect(result.results[0].title).toBe("Zelda");
  });
});
```

### Step 3: Register the Service Factory

Open `lib/services/factory.ts` and instantiate your service.

```typescript
import { IGDBService } from "./games/IGDBService";

const gameService = new IGDBService();

export function getMediaService(category: BoardCategory): MediaService {
  switch (category) {
    case "music":
      return musicService;
    case "cinema":
      return cinemaService;
    case "book":
      return bookService;

    // Add your new case
    case "game":
      return gameService;

    default:
      return musicService;
  }
}
```

---

## 3. Checklist for New Integrations

1.  **Define Types**: Update `MediaType` and `BoardCategory` unions in `lib/types.ts`.
2.  **Create Definition**: Add the UI/Filter config in `lib/media-types/definitions/`.
3.  **Register Types**: Add to `lib/media-types/index.ts`.
4.  **Create Service**: Implement the API adapter in `lib/services/`.
5.  **Register Service**: Add to `getMediaService` in `lib/services/factory.ts`.

Once these steps are complete, the UI (Search Panel, Filters, Cards, Modals) will **automatically adapt** to show your new media type without further changes.
