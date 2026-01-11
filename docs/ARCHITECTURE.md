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
- **Fluid Drag and Drop**: Powered by `@dnd-kit` for high-performance reordering of items and tiers.
- **Dynamic Branding**:
  - **Favicon & Logo**: Automatically derive their color palette from the top tiers of the current board, creating a cohesive visual identity.
  - **Color Extraction**: Optimized hooks extract and persist brand colors to ensure a consistent look during hydration.
- **Data Portability**:
  - **Full-State Export**: Exported JSON files contain the *complete* metadata payload (details, images, tracklists), making lists fully portable between users without requiring new API lookups.
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

### 3. Resilience & Performance
- **SWR Revalidation**: Uses `useSWR` for "stale-while-revalidate" fetching. In the `DetailsModal`, we use `fallbackData` from the board state to show stored info instantly while checking for updates in the background.
- **Server proxying**: API routes in `app/api/` handle rate limiting (MusicBrainz 503s), retry logic, and hide external API keys.
- **Image Fallback Engine**: A robust multi-step strategy for images:
  - **Waterfall**: Fanart.tv -> Wikidata -> Cover Art Archive (CAA).
  - **Optimization**: Requests "preview" sizes (~200px) from Fanart.tv and resized thumbnails (500px) from Wikidata to minimize bandwidth usage.
  - **Unified CAA Endpoint**: Prefers the CAA `release-group` endpoint for both albums and tracks to provide the most representative artwork for a collection.
  - **Healing**: Background fetching of missing artist thumbnails.
  - **Bypass**: Automatic `unoptimized` toggle for domains with resolve issues.

## UI Components
- **Media Card**: Optimized for information density with a 3-line metadata layout (Title, Context, Details) and 112px size, ensuring readability even for long song/album names.
- **Search Filters**: Context-aware filters that adapt to the media type (e.g., duration for songs, type for albums).

## Directory Structure
- `app/api/`: Backend proxies for MusicBrainz, Image sources, and detail enrichment.
- `components/`:
  - `BoardDetailBundler.tsx`: The background worker that keeps board items enriched.
  - `MediaRegistryProvider.tsx`: The persistent global item cache.
  - `DetailsModal.tsx`: Real-time metadata viewer with background revalidation.
- `lib/hooks/`:
  - `useTierList.ts`: Core board state and persistence logic.
  - `useMediaDetails.ts`: Hook for fetching/caching deep metadata.
  - `usePersistentState.ts`: Generic debounced `localStorage` synchronization with robust object merging.
- `lib/server/`: High-level API clients and image fetchers.

