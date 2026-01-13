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
  - **Background Bundling**: A background worker (`BoardDetailBundler`) monitors the board and automatically fetches deep metadata (tracklists, tags, bio) for every item, ensuring the board is always "feature-complete."
  - **Zero-Latency Details**: Pre-fetched metadata is stored directly in the board state. Modals open instantly with full content, even while offline or after a fresh import.
- **Image Reuse & Consistency**:
  - **Shared Asset IDs**: Tracks (recordings) automatically inherit visual metadata from their parent albums (release-groups). By linking items via `albumId`, the app ensures identical artwork is used for both albums and their songs.
  - **Cache Optimization**: Sharing image URLs across different media types significantly reduces redundant network requests and maximizes browser cache hits.

### 2. Core Tier List Functionality

- **Tier List Title**:
  - Users can define a custom title for their tier list, stored in the `TierListState` managed by the `useTierList` hook.
  - The title is displayed prominently in the `Header` component, allowing direct inline editing.
  - The browser tab title is dynamically updated to reflect the current tier list title, improving user orientation.
- **Fluid Drag and Drop**: Powered by `@dnd-kit` for high-performance reordering of items and tiers.
- **Dynamic Branding**:
  - **Favicon & Logo**: Automatically derive their color palette from the top tiers of the current board, creating a cohesive visual identity.
  - **Color Extraction**: Optimized hooks extract and persist brand colors to ensure a consistent look during hydration.
- **Data Portability**:
  - **Full-State Export**: Exported JSON files contain the *complete* metadata payload (details, images, tracklists, and the tier list title), making lists fully portable between users without requiring new API lookups.
  - **High-Res Rendering**: Export boards as professional PNG images via `html-to-image`. The capture logic automatically excludes UI controls and the search panel for a clean, branded output.

## Technical Architecture

### 1. Technology Stack

- **Framework**: Next.js (App Router)
- **UI Library**: React (with Concurrent Mode features like Transitions)
- **Styling**: Vanilla CSS with Tailwind CSS utilities for layout.
- **Persistence**: `localStorage` with automated debouncing and pruning.

### 2. State & Data Flow Strategy

- **Layered Persistence**:
  1. **Board State**: The primary source of truth, managed by `useTierList`. Highly optimized with equality checks to prevent redundant disk writes.
  2. **Global Media Registry**: A persistent `localStorage` cache (`MediaRegistryProvider`) that acts as a "Shared Memory" for the whole app.
  3. **Registry Pruning**: Implements a simple FIFO pruning mechanism (2000-item limit) to prevent `localStorage` bloat while maintaining a vast metadata library.
- **Synergy Pattern**:
  - Updates flow bidirectionally: If the background bundler finds a new image for a board item, it updates the board state **and** the Global Registry. Conversely, search results are "enriched" by checking the registry first, ensuring discovered images appear everywhere instantly.

### 3. Performance & Optimization

#### Caching Strategies
- **Server-Side Cache**: API routes use an LRU-style in-memory cache (`item-cache.ts`) to store normalized media items for 24 hours, reducing redundant mapping logic and upstream API pressure.
- **SWR (Stale-While-Revalidate)**: Used for all data fetching. Components display stale data from the cache immediately while revalidating in the background.
- **Global Item Registry**: Discovered items are cached in `localStorage` across sessions, ensuring artwork and metadata persist even if the board is cleared.

#### Prefetching Mechanisms
- **Pagination Prefetch**: When searching, the app automatically pre-fetches the *next* page of results as soon as the current page loads.
- **Smart Picker Prefetch**: Selecting an item in a `MediaPicker` triggers intelligent preloading:
  - Selecting an **Artist** prefetches their **Albums** (or **Songs** if in a song-filtering context).
  - Selecting an **Album** prefetches its **Songs**.
- **Background Enrichment**: The `BoardDetailBundler` prefetches deep metadata for items added to the board without blocking user interaction.

#### Persistence Logic
- **Debounced Writes**: To avoid performance degradation during rapid state changes (e.g., dragging items), `localStorage` writes are debounced (1000ms).
- **Lazy Hydration**: Application state is hydrated after the initial client mount to prevent SSR mismatch errors and ensure a fast initial paint.
- **Cross-Tab Sync**: Uses the `storage` event to keep state consistent across multiple open browser tabs.

### 4. Resilience & Reliability

- **Server proxying**: API routes in `app/api/` handle rate limiting (MusicBrainz 503s), retry logic, and hide external API keys.
- **Image Fallback Engine**: A robust multi-step strategy for images:
  - **Waterfall**: Fanart.tv -> Wikidata -> Cover Art Archive (CAA).
  - **Optimization**: Requests "preview" sizes (~200px) from Fanart.tv and resized thumbnails (500px) from Wikidata to minimize bandwidth usage.
  - **Unified CAA Endpoint**: Prefers the CAA `release-group` endpoint for both albums and tracks to provide the most representative artwork for a collection.
  - **Healing**: Background fetching of missing artist thumbnails.
  - **Bypass**: Automatic `unoptimized` toggle for domains with resolve issues.

### 5. User Feedback & Interaction

- **Toast Notification System**: A global `ToastProvider` manages stacked notifications to provide immediate feedback for actions (e.g., "Export Successful") and errors (e.g., "MusicBrainz is busy").
- **Drag & Drop**:
  - Implemented using `@dnd-kit` with `PointerSensor` and `KeyboardSensor` for full accessibility.
  - **Collision Detection**: Uses `rectIntersection` for precise drop targeting.
  - **Strategies**: Uses `verticalListSortingStrategy` for tiers and `rectSortingStrategy` for media items.

### 6. Design System

- **Semantic Color Palette**: defined in `lib/colors.ts`, mapping abstract IDs (e.g., 'red', 'amber') to specific Tailwind CSS classes and Hex values.
- **Dynamic Branding**: The `useBrandColors` and `useDynamicFavicon` hooks extract the top 4 tier colors to generate a matching favicon and logo on the fly, ensuring the app's identity reflects the user's content.

### 7. Quality Assurance

- **Unit & Integration Testing**: Powered by **Vitest** and `react-testing-library`. Covers hooks (`useMediaSearch`), utilities (`mappers`), and components (`AlbumFilters`).
- **End-to-End (E2E) Testing**: Powered by **Playwright**. Validates critical user flows like searching for items, dragging them to tiers, and exporting the board.

## Directory Structure

- `app/api/`: Backend proxies for MusicBrainz, Image sources, and detail enrichment.
- `components/`:
  - `TierListApp.tsx`: Main application orchestrator (DnD Context, Layout).
  - `Header.tsx`: Global actions (Import, Export, Screenshot) and branding.
  - `TierBoard.tsx`: Main visualization board managing tier rows and screenshot view.
  - `TierRow.tsx`: Individual tier container (droppable) and header (sortable).
  - `MediaCard.tsx`: Draggable/Sortable item visualization.
  - `SearchPanel.tsx`: Sidebar for discovering new media.
  - `MediaPicker.tsx`: Unified search-and-select component for Artist/Album filters.
  - `BoardDetailBundler.tsx`: The background worker that keeps board items enriched.
  - `MediaRegistryProvider.tsx`: The persistent global item cache.
  - `DetailsModal.tsx`: Real-time metadata viewer with background revalidation.
- `lib/hooks/`:
  - `useTierList.ts`: Core board state and persistence logic.
  - `useTierStructure.ts`: Board manipulation logic (Add/Delete Tiers, Randomize Colors).
  - `useTierListDnD.ts`: Encapsulates Drag and Drop sensors, collisions, and state updates.
  - `useMediaSearch.ts`: SWR-based search logic with debouncing and pagination.
  - `useMediaDetails.ts`: Hook for fetching/caching deep metadata.
  - `usePersistentState.ts`: Generic debounced `localStorage` synchronization with robust object merging.
- `lib/server/`:
  - `musicbrainz.ts`: MusicBrainz API client (search, details).
  - `images.ts`: Multi-source image resolver (Fanart.tv, Wikidata).
  - `item-cache.ts`: Server-side LRU cache for mapped media items.
- `lib/utils/`:
  - `io.ts`: Import/Export logic and JSON validation.
  - `mappers.ts`: Transformation logic from API schemas to internal domain types.
  - `search.ts`: Lucene query construction utilities.
