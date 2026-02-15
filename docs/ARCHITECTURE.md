# Application Architecture: Moat (Music Tier List)

## Overview

**Moat** is a professional-grade, interactive web application for creating and sharing music tier lists. It prioritizes data resilience, speed, and visual excellence, leveraging the MusicBrainz database to provide a rich metadata experience.

## Key Features

### 1. Advanced Metadata Pipeline

- **Search & Discovery**:
  - **Multi-Service Architecture**: Pluggable media services (MusicBrainz, TMDB, OpenLibrary) with a unified search interface.
  - **Unified Filter System**: Consolidated filter panel (`SearchFilters`) tailored to each media type, including:
    - **Entity Specific Filters**:
      - **Artists**: Filter by type and country.
      - **Albums**: Filter by primary and secondary types.
      - **Songs**: Filter by duration.
      - **Books**: Filter by language, publisher, person, or place.
    - **Shared Logic**: Global toggles for Fuzzy Search, Partial Match, and "Show Added" items allow for consistent result behavior across all search tabs.
    - **Server-Side Sorting**: Support for Relevance, Date, and Rating-based sorting. The app prioritizes global server-side sorting (e.g., via TMDB Discover or Open Library features) over client-side sorting to ensure pagination works correctly. A UI indicator appears when results are only sorted on the current page.
    - **Discovery Mode**: For Cinema and Books, leaving the search box empty displays "Popular" or "Trending" items, allowing for exploratory browsing via sort and filters without requiring a specific query.
  - **Persistent Global Library**: Every item encountered in search is stored in a persistent `MediaRegistry`. Once an image or tracklist is found, it is remembered across sessions.
  - **Self-Healing Images**: If an artist image is missing during search, the app automatically fetches it in the background from **Fanart.tv** or **Wikidata** once the item is added to the board.
- **Deep Metadata Sync**:
  - **Unified Media Resolution**: The central `useMediaResolver` hook manages the entire lifecycle of an item (Registry <-> Board <-> API). It ensures that whether an item is being enriched in the background or viewed in a modal, the logic for fetching and synchronization is identical.
  - **Background Enrichment**: A background hook (`useBackgroundEnrichment`) monitors the board and automatically fetches deep metadata (tracklists, tags, bio) for every item without blocking user interaction.
  - **Zero-Latency Details**: Pre-fetched metadata is stored directly in the board state. Modals open instantly with full content, even while offline or after a fresh import.
- **Image Reuse & Consistency**:
  - **Shared Asset IDs**: Tracks (recordings) automatically inherit visual metadata from their parent albums (release-groups). By linking items via `albumId`, the app ensures identical artwork is used for both albums and their songs.
  - **Cache Optimization**: Sharing image URLs across different media types significantly reduces redundant network requests and maximizes browser cache hits.

### 2. Core Tier List Functionality

- **Multi-Board Architecture**:
  - **Registry System**: A `MediaRegistry`-independent "Board Registry" manages the list of all created tier lists.
  - **Dashboard**: The entry point of the application (`app/page.tsx`) renders the `Dashboard` component, allowing users to create, delete, and navigate between multiple independent boards.
  - **Dynamic Routing**: Each board is identified by a UUID and accessed via `/board/[id]`. The `TierListProvider` is initialized with this ID to isolate state persistence for each board (e.g., `moat-board-{uuid}`).

- **Tier List Title**:
  - Users can define a custom title for their tier list, stored in the `TierListState` managed by the `useTierList` hook.
  - The title is displayed prominently in the `Header` component, allowing direct inline editing.
  - The browser tab title is dynamically updated to reflect the current tier list title, improving user orientation.
- **Fluid Drag and Drop**: Powered by `@dnd-kit` for high-performance reordering of items and tiers.
- **Dynamic Branding**:
  - **Favicon Generation**: The `useDynamicFavicon` hook generates a custom SVG favicon on-the-fly based on the top 4 tier colors of the active board. This SVG is converted to a Data URI and applied to the document head, ensuring the browser tab visually matches the content.
  - **Brand Logo**: The `BrandLogo` component adapts to the board's palette, cycling through the top 5 tier colors for the "M-O-A-T" letters.
  - **Color Extraction**: `useBrandColors` memoizes the palette extraction logic, ensuring consistent branding across the UI (Dashboard, Header, OG Images) without layout thrashing.
- **Data Portability**:
  - **Full-State Export**: Exported JSON files contain the _complete_ metadata payload (details, images, tracklists, and the tier list title), making lists fully portable between users without requiring new API lookups.
  - **High-Res Rendering**: Export boards as professional PNG images via `html-to-image`. The capture logic automatically excludes UI controls and the search panel for a clean, branded output.
- **History Control**:
  - **Undo/Redo**: Full state history management allows users to revert actions (drag-and-drop, text edits, deletions) with standard keyboard shortcuts or UI buttons.
  - **Keyboard Shortcuts Modal**: A helpful modal accessible from the header lists all available keyboard shortcuts.

## Technical Architecture

### 1. Technology Stack

- **Framework**: Next.js (App Router)
- **UI Library**: React (with Concurrent Mode features like Transitions)
- **Styling**: Vanilla CSS with Tailwind CSS utilities for layout.
- **Persistence**: `IndexedDB` (via `idb-keyval`) for scalable, asynchronous storage.
- **Logging**: `pino` for structured logging.

#### Media Services

- **Architecture**: Registry-based abstraction.
- **Registry**: `MediaServiceRegistry` (singleton) for dynamic service discovery and fallback handling.
- **Registry**: `MediaTypeRegistry` for centralized UI configuration (icons, filters, sorting).
- **Services**: Pure API adapters for fetching data.
  - **Music**: `MusicService` (MusicBrainz)
  - **Cinema**: `TMDBService` (TMDB)
  - **Books**: `OpenLibraryService` (Open Library)
- **Robustness**: Shared `secureFetch` client with automatic exponential backoff retries for 503, 504, and 429 errors.

### 2. State & Data Flow Strategy

- **Layered Persistence**:
  1. **Board State (Context + Reducer)**:
     - The application state (`items`, `tierDefs`, `title`) is held in `TierListContext`.
     - It uses `usePersistentReducer` (a custom hook combining `useReducer` with asynchronous IndexedDB persistence) for centralized state logic and persistence.
     - **Slice Reducer Pattern**: The core logic in `reducer.ts` is divided into specialized "slices" (`tier-reducer.ts`, `item-reducer.ts`, `global-reducer.ts`) for better maintainability and testability.
     - This architecture decouples state transitions from UI components, using a standard `dispatch(Action)` pattern.
  2. **Global Media Registry**: A persistent `IndexedDB` cache (`MediaRegistryProvider`) that acts as a "Shared Memory" for the whole app.
  3. **Registry Pruning**: Implements a simple FIFO pruning mechanism (2000-item limit) to prevent storage bloat.
  4. **Optimized Merging**: The registry uses shallow diffing of critical metadata (title, artist, primary images) before falling back to deep object comparison, minimizing unnecessary state updates and disk writes.
  5. **Batch Processing**: The `registerItems` API allows processing hundreds of items in a single React render cycle and a single IndexedDB transaction, critical for imports and search result delivery.

- **Hook Composition Pattern**:
  - **TierListContext** (The Controller): Serves as the centralized logic hub. It composes specialized logic hooks (`useTierListDnD`, `useTierListIO`, `useTierStructure`, `useTierListUtils`) internally.
  - **useTierListNamespaces**: A specialized hook that aggregates the state, dispatch, and sub-hooks into a unified, **namespaced API** for better discoverability and memoization:
    - `state`: Domain data (`tierDefs`, `items`, `title`).
    - `actions`: Business logic (`addTier`, `deleteTier`, `import`, `export`, `randomizeColors`, `updateMediaItem`, `updateTitle`, `removeItemFromTier`, `locate`).
    - `dnd`: Drag & Drop primitives (`sensors`, `activeItem`, `activeTier`, `overId`, `handleDragStart`, `handleDragOver`, `handleDragEnd`).
    - `ui`: UI-specific state (`headerColors`, `detailsItem`, `showDetails`, `closeDetails`, `addedItemIds`, `allBoardItems`).
    - `history`: Undo/Redo controls (`undo`, `redo`, `canUndo`, `canRedo`, `push`).
  - **Separation of Concerns**:
    - `useTierListIO`: Handles Import/Export logic.
    - `useTierListDnD`: Handles Drag and Drop sensors and collisions.
    - `useTierStructure`: Handles adding/deleting tiers and randomizing colors.
    - `useTierListUtils`: Handles derived state (header colors) and UI utilities (scrolling).

- **Detailed Support Systems**:
  - **ID Normalization** (`lib/utils/ids.ts`): Standardizes how items are tracked across search results, the board, and the DOM.
    - **Context Isolation**: Uses a standard prefixing system (`toSearchId`) to distinguish between an item in search results vs. the same item on the board within the same `dnd-kit` context.
    - **Bi-directional Mapping**: Utilities like `fromSearchId` and `isSearchId` ensure stable state transitions during drag-and-drop operations.
    - **DOM Stability**: Centralized `toDomId` generation ensures consistent element targeting for scrolling, anchoring, and integration testing.
  - **Entity Mappers** (`lib/utils/mappers.ts`): Pure functions for transforming raw API responses (MusicBrainz, TMDB, OpenLibrary) into the internal `MediaItem` domain objects.
  - **Optimization Primitives** (`lib/utils/comparisons.ts`): Optimized deep-comparison utilities like `hasMediaItemUpdates` prevent redundant state updates when merging metadata.

- **Undo/Redo System**:
  - **History Management**: Implemented via `useHistory` hook which maintains `past` and `future` state stacks in memory.
  - **Integration**: The `TierListContext` integrates `useHistory` alongside `usePersistentState`.
  - **Snapshot Strategy**:
    - **Explicit Snapshots**: History is recorded explicitly via `history.push()` before significant destructive actions (Drag Start, Add/Delete Tier, Import, Clear).
    - **Granularity**: Transient updates (like `handleDragOver` or continuous text input) do not pollute the history stack, ensuring a clean "Undo" experience that reverts to the start of the action.
    - **Keyboard Support**: Full support for standard shortcuts (Cmd/Ctrl+Z for Undo, Cmd/Ctrl+Shift+Z for Redo).

- **Interaction System**:
  - **Context-Based Hover Tracking**: `InteractionContext` provides a global way to track which item is currently hovered.
  - **Global Shortcuts**: `TierListApp` listens for global key events (`x` to remove, `i` to inspect) and executes actions based on the current context from `InteractionContext`.

- **Synergy Pattern**:
  - Updates flow bidirectionally: If the background hook finds a new image for a board item, it updates the board state **and** the Global Registry. Conversely, search results are "enriched" by checking the registry first, ensuring discovered images appear everywhere instantly.

### 3. Media Architecture (Registry & Services)

The application uses a **Registry-based Architecture** to manage diverse media types.

#### A. Media Type Registry (`lib/media-types/`)

The central authority for "What a media type is".

- **Definitions**: JSON-like configuration files defining:
  - Identity (ID, label, icon)
  - UI Config (colors, subtitle formatters)
  - Filters (definitions for text, select, range, etc.)
  - Sort Options
- **Registry**: Exposes a unified API (`get(type)`, `getByCategory(cat)`) for consumers.

#### B. Service Layer (`lib/services/`)

Pure **API Adapters** responsible for "How to fetch data".

- **Responsibility**: Fetching data from external APIs and mapping it to the internal `MediaItem` schema.
- **Interface**: All services implement `MediaService` (search, getDetails, category).
- **Isolation**: Services contain NO UI or Filter configuration logic.

#### C. Media Enrichment Lifecycle

The application uses a unified **Media Resolver** pattern to ensure consistency and prevent redundant network requests:

1. **Discovery**: Search results return "Minimal" items.
2. **Resolution**: `useMediaResolver` checks the **Global Media Registry** (IndexedDB). If a more complete version is found in the cache, it is propagated instantly to the UI.
3. **Enrichment**: If metadata or high-res images are missing, it triggers an on-demand fetch from `/api/details`.
4. **Synchronization**: New data is committed to both the **Board State** and the **Global Registry** in a single cycle. Because all cards (both on the board and in search results) consume the resolver, they update their visual state (e.g., healing a broken image or updating a subtitle) simultaneously.

### 4. Performance & Optimization

#### Caching Strategies

- **Server-Side Cache**: API routes use an LRU-style in-memory cache (`item-cache.ts`) to store normalized media items for 24 hours, reducing redundant mapping logic and upstream API pressure.
- **SWR (Stale-While-Revalidate)**: Used for all data fetching. Components display stale data from the cache immediately while revalidating in the background.
- **Global Item Registry**: Discovered items are cached in `IndexedDB` across sessions, ensuring artwork and metadata persist even if the board is cleared.

#### Prefetching Mechanisms

- **Conditional Pagination Prefetch**: When searching, the app can pre-fetch the _next_ page of results, but this is now controlled by a `prefetchEnabled` flag. Prefetching is **disabled** while the user is interacting with the search/filter zone (e.g., typing in the search box, adjusting filters) to prioritize user-initiated requests. It is **enabled** when the user moves focus to the results grid. `MediaPicker` components explicitly disable prefetching as they don't support pagination.
- **Background Enrichment**: The `useBackgroundEnrichment` hook fetches deep metadata for items added to the board without blocking user interaction. It processes up to 3 items concurrently.

#### Persistence Logic

- **Debounced Writes**: To avoid performance degradation during rapid state changes (e.g., dragging items), `IndexedDB` writes are debounced (500-1000ms).
- **Hydration-Safe Persistence**: The persistence hooks (`usePersistentReducer`, `usePersistentState`) are designed to prevent "state regression". They explicitly wait for the first debounce cycle after hydration BEFORE allowing a write to storage, ensuring that the `initialState` (the state before hydration) never overwrites the actual persisted data.
- **Unmount Flush**: To ensure the latest user changes are never lost during rapid navigation, persistence hooks perform a synchronous-like storage write during the component unmount phase using a `useRef` to the latest state.
- **Proactive Registry Warming**:
  - **Hydration Sync**: Immediately after the board state hydrates, all board items are pushed to the `MediaRegistry` in a single batch. This "warms" the global cache, ensuring search results for items already on your board are enriched instantly.
  - **Import Sync**: Board imports bypass individual item registration and use the batched `registerItems` API to populate the registry in bulk.
- **Lazy Hydration**: Application state is hydrated asynchronously after the initial client mount. The app displays a loading state during this phase.
- **Cross-Tab Sync**: (Note: Cross-tab sync via storage events is currently disabled with IndexedDB, but consistency is maintained via optimistic UI updates).

#### Virtualization

- **VirtualGrid Component**: A reusable, responsive virtualized grid powered by `@tanstack/react-virtual`.
- **Large Tier Handling**: Tiers containing more than 100 items automatically switch to a virtualized view, ensuring performance remains high even for massive categories. Smaller tiers and search results (limited to 15 items) use standard grid layouts for simplicity and lower overhead.

#### Drag & Drop Stability

- **Idempotent Movement**: The `item-reducer` implements an idempotency check during `MOVE_ITEM` actions. If a drag event targeting a Tier ID suggests no logical change (item already in that tier), the reducer returns the original state reference. This prevents a storm of redundant re-renders during rapid motion.
- **Optimized Hydration Sync**: `TierListContext` synchronizes items with the `MediaRegistry` only upon initial board hydration. By excluding `state.items` from the effect dependencies, we prevent the heavy registry sync from firing during drag-and-drop operations, significantly reducing CPU pressure.

### 5. Resilience & Reliability

- **Server proxying**: API routes in `app/api/` handle rate limiting (MusicBrainz 503s), retry logic, and hide external API keys.
- **Image Fallback Engine**: A robust multi-step strategy for images:
  - **Waterfall**: Fanart.tv -> Wikidata -> Cover Art Archive (CAA).
  - **Optimization**: Requests "preview" sizes (~200px) from Fanart.tv and resized thumbnails (500px) from Wikidata to minimize bandwidth usage.
  - **Unified CAA Endpoint**: Prefers the CAA `release-group` endpoint for both albums and tracks to provide the most representative artwork for a collection.
  - **Healing**: Background fetching of missing artist thumbnails.
  - **Bypass**: Automatic `unoptimized` toggle for domains with resolve issues.

### 6. User Feedback & Interaction

- **Toast Notification System**: A global `ToastProvider` manages stacked notifications to provide immediate feedback for actions (e.g., "Export Successful") and errors (e.g., "MusicBrainz is busy").
- **Drag & Drop**:
  - Implemented using `@dnd-kit` with `PointerSensor` and `KeyboardSensor` for full accessibility.
  - **Collision Detection**: Uses `rectIntersection` for precise drop targeting.
  - **Strategies**: Uses `verticalListSortingStrategy` for tiers and `rectSortingStrategy` for media items.

### 7. Design System

- **Semantic Color Palette**: defined in `lib/colors.ts`, mapping abstract IDs (e.g., 'red', 'amber') to specific Tailwind CSS classes and Hex values.
- **Dynamic Branding**: The `useBrandColors` and `useDynamicFavicon` hooks extract the top 4 tier colors to generate a matching favicon and logo on the fly, ensuring the app's identity reflects the user's content.
- **Unified Media UI**:
  - `lib/media-types/registry.ts` acts as the single source of truth for UI configurations (icons, colors, label formatting).
  - Components consume this configuration to render dynamic content without scattered conditional logic.

### 8. Testing Strategy

Moat employs a multi-layered testing strategy combining unit and integration tests driven by Vitest.

#### A. Integration Testing (Fake Server Pattern)

- **Mock Service Worker (MSW)**: Instead of mocking internal service methods or domain logic, the app intercepts network requests at the `fetch` level using MSW.
- **Contract-Based Testing**: Tests assert on the _outcome_ (data returned by the service) rather than implementation details (which function was called).
- **Lucene Query Validation**: A robust `lucene-evaluator` parses and evaluates complex queries (AND, OR, NOT, Wildcards) against a fake in-memory database, ensuring service-to-API compatibility.
- **Error Simulation**: MSW allows granular simulation of API failures (503s, 500s, 404s) to verify exponential backoff and retry logic in the `secureFetch` client.

#### B. UI Component Testing

- **Focus**: Critical interactive components like `MediaCard`, `MediaPicker`, and `DetailsModal`.
- **Methodology**: Uses `@testing-library/react` and `jsdom`. Mocks complex hooks (`useMediaSearch`, `useMediaDetails`) to test component logic in isolation from the network.
- **Coverage**: Verifies rendering accuracy, user interactions (selection, deletion, hovering), and error states (image fallbacks).

#### C. API Route Testing

- **Unit Testing**: API routes like `app/api/search` are tested as pure functions, verifying query parameter parsing, service delegation, and HTTP status code mapping.

#### D. End-to-End (E2E) Testing

- **Tooling**: Playwright is used for full browser environment testing, covering critical user journeys (CUJs).
- **Core Coverage**:
  - **Tier Management**: Adding, deleting, renaming, and reordering tiers.
  - **Media Interaction**: Searching for media, dragging items from search to tiers, and cross-tier reordering.
  - **Persistence**: Verifying data persists across page reloads via IndexedDB.
  - **Data IO**: Testing JSON import/export functionality with real files.
  - **Accessibility**: Ensuring keyboard-driven drag-and-drop operations (powered by dnd-kit) are functional and stable.
- **Page Object Models (POM)**:
  - `BoardPage`: Encapsulates board interactions (tiers, title, options).
  - `SearchPanel`: Manages search tab switching, filtering, and dragging results.
  - `DashboardPage`: Handles board creation, deletion, and cross-session persistence.
- **Visual Regression**:
  - Automated screenshot comparisons ensure UI consistency across Chromium and Firefox.
  - Snapshot testing covers the default board state, populated boards, and the search panel.
- **Stabilization Techniques**:
  - Use of `data-testid` for robust element selection.
  - Explicit synchronization for asynchronous state updates (debounce/IndexedDB).
  - Multi-browser validation (Chromium, Firefox).

#### E. Sorting & Discovery Testing

We use high-fidelity integration tests with MSW to verify our sorting and discovery logic across all media services:

- **`TMDBService.test.ts`**: Verifies that empty queries correctly trigger discovery mode and that server-side sorting via `sort_by` works as expected.
- **`OpenLibraryService.test.ts`**: Ensures the native `sort` parameter is correctly mapped and passed to the API.
- **`MusicService.test.ts`**: Confirms that services without sorting support correctly report themselves as not server-sorted, allowing the client to take over.
- **`route.test.ts`**: Validates the API's "Discovery Category" allow-list logic.

### 9. Screenshot Engine & Export Architecture

The app employs a dedicated "Clean Room" architecture to generate professional-grade PNG exports.

- **Clean Room Rendering**:
  - The `useScreenshot` hook renders a non-interactive `ExportBoard` component into a hidden, off-screen DOM container.
  - This isolates the export process from the active session, stripping away UI artifacts (scrollbars, hover states) and disabling virtualization to ensure all items are rendered regardless of scroll position.

- **Image Resolution Pipeline**:
  - **Pre-Resolution**: Before rendering, the engine resolves all board images to Base64 Data URLs to prevent network flakiness during capture.
  - **Custom Proxy**: A dedicated API route (`/api/proxy-image`) is used to fetch images. This bypasses Next.js image optimization (resizing/formatting) to reliably fetch raw source images from providers like Fanart.tv, avoiding CORS blocks and strict domain validation errors.
  - **Fallback Strategy**: If the proxy fails, the engine attempts a direct client-side fetch, ensuring maximum compatibility with different CDNs.

### 10. Open Graph (OG) Generation

Moat supports dynamic Open Graph images for social sharing.

- **Satori Engine**: Uses `@vercel/og` (powered by Satori) to generate OG images on the fly via the `/api/og` endpoint.
- **OGBoard Component**: A simplified, styling-constrained version of the board specialized for Satori's layout engine (Flexbox only, inline styles).
- **Dynamic Content**: The endpoint currently accepts parameters (like `title`) and can be extended to fetch and render a preview of a specific shared board.
- **Image Resilience**: The API pre-validates all board images via a server-side `scrubBoardImages` utility before rendering. Any image URL that returns a 404 or non-image content is scrubbed (set to `undefined`), allowing Satori to render the board without crashing.

## Directory Structure

- `app/`:
  - `page.tsx`: Entry point rendering the Dashboard.
  - `board/[id]/page.tsx`: Dynamic route for individual tier lists.
  - `api/`: Backend proxies for MusicBrainz, Image sources, and detail enrichment.
    - `details/`, `search/`, `proxy-image/`: Data and image proxies.
    - `og/`: **[New]** Dynamic Open Graph image generator.
- `components/`:
  - `TierListApp.tsx`: Main layout component (Layout only, logic moved to Context).
  - `TierListContext.tsx`: Core state provider and logic controller (persistence, hydration, DnD, IO).
  - `MediaRegistryProvider.tsx`: The persistent global item cache.
  - `board/`: Components related to the tier board visualization.
    - `TierBoard.tsx`: Main visualization board managing tier rows and screenshot view.
    - `OGBoard.tsx`: **[New]** Satori-compatible board for OG images.
    - `TierList.tsx`: Shared component for rendering the list of tiers, used by both TierBoard and ExportBoard.
    - `TierRow.tsx`: Individual tier container (droppable) and header (sortable).
    - `TierGrid.tsx`: Renders the grid of items within a tier (standard or virtualized).
    - `BoardTitle.tsx`: Shared component for the board title, supporting both editable and export modes.
    - `ExportBoard.tsx`: Non-interactive board variant optimized for screenshot capture.
    - `VirtualGrid.tsx`: Generic virtualized grid for high-performance list rendering.
  - `dashboard/`:
    - `Dashboard.tsx`: **[New]** Board management interface (create/delete/navigate).
  - `media/`: Components for media item display and selection.
    - `MediaCard.tsx`: Draggable/Sortable item visualization.
    - `DetailsModal.tsx`: Real-time metadata viewer with background revalidation.
    - `MediaPicker.tsx`: Unified search-and-select component.
  - `search/`: Components for the search interface.
    - `SearchPanel.tsx`: Sidebar for discovering new media.
  - `ui/`: Shared UI components.
    - `BrandLogo.tsx`: **[New]** Dynamic logo component.
    - `Header.tsx`: Global actions (Import, Export, Screenshot, Undo/Redo) and branding.
    - `InteractionContext.tsx`: Global context for tracking hovered items.
    - `KeyboardShortcutsModal.tsx`: Displays available keyboard shortcuts.
- `lib/hooks/`:
  - `index.ts`: Barrel file exporting all hooks.
  - `useBoardRegistry.ts`: **[New]** Manages the list of user boards.
  - `useDynamicFavicon.ts`: **[New]** Generates and applies dynamic favicons.
  - `useBrandColors.ts`: **[New]** Extracts palette from tier state.
  - `useTierListIO.ts`: Encapsulates Import/Export logic.
  - `useScreenshot.tsx`: Orchestrates high-fidelity board capture and image resolution.
  - `useTierListUtils.ts`: Encapsulates derived state and UI utilities.
  - `useHistory.ts`: Generic hook for managing state history (past/future stacks).
  - `useEscapeKey.ts`: Generic hook for handling Escape key press.
  - `useBackgroundEnrichment.ts`: Background hook for syncing item metadata.
  - `useTierStructure.ts`: Board manipulation logic (Add/Delete Tiers, Randomize Colors).
  - `useTierListDnD.ts`: Encapsulates Drag and Drop sensors, collisions, and state updates.
  - `useTierListNamespaces.ts`: Aggregates state and sub-hook logic into namespaced API objects.
  - `useMediaSearch.ts`: SWR-based search logic with debouncing and pagination.
  - `useMediaDetails.ts`: Hook for fetching/caching deep metadata.
  - `usePersistentState.ts`: Generic debounced `IndexedDB` synchronization.
  - `usePersistentReducer.ts`: Combines `useReducer` with async persistence.
- `lib/state/`: Centralized State Logic
  - `actions.ts`: Action definitions (ADD_TIER, MOVE_ITEM, etc.).
  - `reducer.ts`: Pure state transition logic (Delegates to slices).
  - `slices/`: Domain-specific logic slices.
    - `tier-reducer.ts`: Logic for tier structure and colors.
    - `item-reducer.ts`: Logic for item movements and metadata.
    - `global-reducer.ts`: Logic for board titles and state overrides.
- `lib/services/`:
  - `music/`, `cinema/`, `books/`: Domain specific services.
  - `factory.ts`: Service locator pattern.
  - `types.ts`: Core service interfaces.
- `lib/media-types/`:
  - `definitions/`: Individual config files for each type.
  - `registry.ts`: The singleton registry class.
  - `types.ts`: Type definitions for the abstraction.
- `lib/server/`:
  - `images.ts`: Multi-source image resolver (Fanart.tv, Wikidata).
  - `item-cache.ts`: Server-side LRU cache for mapped media items.
- `lib/utils/`:
  - `io.ts`: Import/Export logic and JSON validation.
  - `mappers.ts`: Transformation logic from API schemas to internal domain types.
  - `search.ts`: Lucene query construction utilities.
  - `search.ts`: Lucene query construction utilities.
