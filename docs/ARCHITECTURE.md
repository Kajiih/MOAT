# Application Architecture: Moat (Music Tier List)

## Overview

**Moat** is a professional-grade, interactive web application for creating and sharing music tier lists. It prioritizes data resilience, speed, and visual excellence, leveraging the MusicBrainz database to provide a rich metadata experience.

## Key Features

### 1. Advanced Metadata Pipeline

- **Search & Discovery**:
  - Integrated with **MusicBrainz API** with smart fuzzy matching and advanced filtering.
  - **Entity Specific Filters**:
    - **Artists**: Filter by type (Person, Group, etc.) and country of origin.
    - **Albums**: Filter by primary type (Album, EP, Single) and secondary types (Live, Compilation, etc.).
    - **Songs**: Filter by duration range (minimum/maximum seconds).
  - **Persistent Global Library**: Every item encountered in search is stored in a persistent `MediaRegistry`. Once an image or tracklist is found, it is remembered across sessions.
  - **Self-Healing Images**: If an artist image is missing during search, the app automatically fetches it in the background from **Fanart.tv** or **Wikidata** once the item is added to the board.
- **Deep Metadata Sync**:
  - **Background Enrichment**: A background hook (`useBackgroundEnrichment`) monitors the board and automatically fetches deep metadata (tracklists, tags, bio) for every item, ensuring the board is always "feature-complete."
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

### 3. Service Layer (Backend)

The backend logic handling MusicBrainz interactions is modularized into a Service Layer (`lib/services/musicbrainz/`).

- **Modules**:
  - `client.ts`: The HTTP client wrapping `fetch`. Handles `User-Agent` headers and implements automatic retries for **503 Service Unavailable** errors (rate limiting).
  - `query-builder.ts`: A pure logic module that translates internal filter objects (tags, year ranges, types) into Lucene-syntax query strings required by MusicBrainz.
  - `search.ts`: Orchestrates the search flow: Query Build -> Fetch -> Validation (Zod) -> Mapping (Domain Types).
  - `details.ts`: Handles deep metadata fetching, including resolving `release-group` to specific `release` entities for tracklists.

### 4. Performance & Optimization

#### Caching Strategies

- **Server-Side Cache**: API routes use an LRU-style in-memory cache (`item-cache.ts`) to store normalized media items for 24 hours, reducing redundant mapping logic and upstream API pressure.
- **SWR (Stale-While-Revalidate)**: Used for all data fetching. Components display stale data from the cache immediately while revalidating in the background.
- **Global Item Registry**: Discovered items are cached in `IndexedDB` across sessions, ensuring artwork and metadata persist even if the board is cleared.

#### Prefetching Mechanisms

- **Pagination Prefetch**: When searching, the app automatically pre-fetches the _next_ page of results as soon as the current page loads.
- **Smart Picker Prefetch**: Selecting an item in a `MediaPicker` triggers intelligent preloading:
  - Selecting an **Artist** prefetches their **Albums** (or **Songs** if in a song-filtering context).
  - Selecting an **Album** prefetches its **Songs**.
- **Background Enrichment**: The `useBackgroundEnrichment` hook prefetches deep metadata for items added to the board without blocking user interaction.

#### Persistence Logic

- **Debounced Writes**: To avoid performance degradation during rapid state changes (e.g., dragging items), `IndexedDB` writes are debounced (1000ms).
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
  - `lib/media-defs.tsx` acts as the single source of truth for UI configurations (icons, colors, label formatting) keyed by media type (`album`, `artist`, `song`).
  - Components like `MediaCard` and `DetailsModal` consume this configuration to render dynamic content without scattered conditional logic.

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
  - `musicbrainz/`: Service layer for MusicBrainz integration.
    - `client.ts`: HTTP client with 503 retry logic.
    - `query-builder.ts`: Lucene query construction logic.
    - `search.ts`: Search orchestration and validation.
    - `details.ts`: Detail fetching orchestration.
- `lib/server/`:
  - `images.ts`: Multi-source image resolver (Fanart.tv, Wikidata).
  - `item-cache.ts`: Server-side LRU cache for mapped media items.
- `lib/utils/`:
  - `io.ts`: Import/Export logic and JSON validation.
  - `mappers.ts`: Transformation logic from API schemas to internal domain types.
  - `search.ts`: Lucene query construction utilities.
- `lib/media-defs.tsx`: UI configuration map for media types (icons, colors, formatters).
