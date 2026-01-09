# Application Analysis: Moat (Music Tier List)

## Overview
**Moat** is a modern, interactive web application designed for creating music tier lists. It allows users to search for albums, artists, or songs from the MusicBrainz database and organize them into customizable tiers using a drag-and-drop interface.

## Key Features

### 1. Core Functionality
- **Search & Discovery**:
  - Integrated with **MusicBrainz API** to search for Albums, Artists, and Songs.
  - Supports detailed filtering: Year range, Primary types (Album, Single, etc.), Secondary types (Live, Remix, etc.).
  - **Smarter Matching**: Uses Lucene "AUTO" behavior for dynamic fuzzy distance based on word length.
  - **Performance Optimization**: Wildcards are only applied to the *last word* being typed to prevent search expansion issues. 
  - **Artist Picker**: Allows filtering releases by a specific artist context.
- **Drag and Drop**:
  - Smooth, accessible drag-and-drop experience powered by `@dnd-kit`.
  - Reorder items within tiers.
  - Reorder entire tier rows.
  - Drag items from search results directly to the board.
- **Tier Management**:
  - Add, Delete, and Rename tiers.
  - Customize tier colors (using a predefined semantic color palette).
  - Clear board or reset to default state.
- **Detailed Metadata**:
  - Click on any item to view detailed info (Tracklist, Release Date, Label, Life Span for artists).

### 2. User Experience (UX)
- **Persistance**: Automatically saves the board state to `localStorage` so users don't lose progress on refresh. Use of `debouncing` ensures performance.
- **Tab Synchronization**: Updates across multiple open tabs in real-time.
- **Export & Import**:
  - **Export Image**: Generates a high-quality PNG of the tier list using `html-to-image`.
  - **Export/Import JSON**: Save and load board configurations.
- **Dynamic Branding**:
  - **Favicon**: Dynamically updates to match the tier list's top colors.
    - **Design**: Uses a generated SVG with a 3-bar layout: Top (Tier 1), Middle (Split Tier 2/3), Bottom (Tier 4).
    - **Persistence**: Implements a "Safe Zone" strategy (0ms delay for interaction, 100ms for load) to handle Next.js hydration and ensure updates persist.
  - **Logo System**: Centralized "MOAT" logo via `BrandLogo` component using consistent `useBrandColors` hook to derive the 4-color palette (handling defaults and fallbacks).

## Technical Architecture

### 1. Technology Stack
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Validation**: [Zod](https://zod.dev/) (for API response validation)

### 2. State Management & Data Flow
- **Client State**: 
  - Managed via a custom hook `useTierList`.
  - Complex logic (Drag handling, Tier CRUD) is separated into `useTierListDnD` and `useTierStructure` hooks.
  - **Persistence**: `usePersistentState` hook handles `localStorage` synchronization with `use-debounce` (1000ms delay) to prevent excessive writes.
- **Server Data**:
  - **MusicBrainz Integration**: Data is fetched via Next.js API Routes (`app/api/search`, `app/api/details`).
  - **Advanced Search**: Queries are constructed using normalized **Lucene syntax** (`lib/utils/search.ts`) to support complex filtering (date ranges, specific artist IDs, and filtering by secondary types).
  - **Validation**: Zod schemas (`lib/types.ts`) ensure data from MusicBrainz matches the internal `MediaItem` interface before reaching the frontend.
    - **Server-Side Cache**: 
      - Next.js default revalidation (1h search, 24h details).
      - **MediaItem Registry**: A singleton server-side cache (`ItemCache`) to prevent redundant mapping/image lookups for popular items across different queries.
    - **Client-Side Cache**: 
      - Handled by `swr` for API requests.
      - **Global Media Registry**: A React Context (`MediaRegistryProvider`) that shares discovered artist/album data across all UI components (Search Tabs, Artist Pickers).

### 3. Image Handling & Resilience
- **Multi-Source Art**: 
  - Album/Song art is sourced from the **Cover Art Archive**.
  - Artist images use a waterfall strategy: **Fanart.tv** (high quality) with a fallback to **Wikidata/Wikimedia Commons** (high coverage).
- **Optimization Strategy**:
  - Uses `next/image` for performance.
  - **Bypass Mechanism**: Implements a retry strategy for domains like `archive.org` that may trigger "Private IP" resolution errors in the Next.js optimization server. On failure, the component switches to `unoptimized={true}` to allow direct browser fetching.
  - **Error Management**: Failed image URLs are cached in a session-level `Set` to prevent repeated failed requests.
- **API Resilience**:
  - **Rate Limit Detection**: Gracefully detects MusicBrainz 503 (busy) errors on the server and propagates them to the UI.
  - **User Feedback**: Triggers user-friendly toast notifications when downstream APIs are unavailable.

### 4. Quality Assurance
- **Unit Testing**: Powered by **Vitest** and **React Testing Library**. Focuses on complex hooks (`useTierStructure`) and data mappers.
- **E2E Testing**: **Playwright** is used for critical path verification (searching, dragging items to tiers, and board persistence).

### 5. Key Libraries
- **@dnd-kit**: chosen for its modularity and accessibility over older libraries like `react-beautiful-dnd`.
- **html-to-image**: For client-side image generation.
- **downloadjs**: For handling file downloads.
- **clsx / tailwind-merge**: For robust class name composition.

## Directory Structure
- `app/`: Next.js App Router setup.
  - `api/`: Backend proxy routes (`search`, `details`) to hide API keys (if any) and handle CORS/Validation.
- `components/`: Atomic UI components (`TierBoard`, `MediaCard`, `SearchPanel`).
  - `MediaRegistryProvider.tsx`: Global client-side item registry.
- `lib/`:
  - `hooks/`: Custom hooks for logic separation (`useTierList`, `useScreenshot`).
  - `server/`: Server-side only logic (MusicBrainz client).
    - `item-cache.ts`: Server-side MediaItem cache.
  - `types.ts`: Centralized type definitions (`TierListState`, `MediaItem`).
