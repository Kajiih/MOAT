# Application Analysis: Moat (Music Tier List)

## Overview
**Moat** is a modern, interactive web application designed for creating music tier lists. It allows users to search for albums, artists, or songs from the MusicBrainz database and organize them into customizable tiers using a drag-and-drop interface.

## Key Features

### 1. Core Functionality
- **Search & Discovery**:
  - Integrated with **MusicBrainz API** to search for Albums, Artists, and Songs.
  - Supports detailed filtering: Year range, Primary types (Album, Single, etc.), Secondary types (Live, Remix, etc.).
  - **Fuzzy Search** and **Wildcard** support toggle.
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
- **Dynamic Theming**: The browser favicon updates dynamically to match the colors of the tier headers.

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
  - **Validation**: Zod schemas (`lib/types.ts`) ensure data from MusicBrainz matches the internal `MediaItem` interface before reaching the frontend.
  - **Caching**: Search queries are constructed (normalized) in `lib/api.ts`. The project utilizes `swr` (Stale-While-Revalidate) for efficient data fetching and caching on the client.

### 3. Key Libraries
- **@dnd-kit**: chosen for its modularity and accessibility over older libraries like `react-beautiful-dnd`.
- **html-to-image**: For client-side image generation.
- **downloadjs**: For handling file downloads.
- **clsx / tailwind-merge**: For robust class name composition.

## Directory Structure
- `app/`: Next.js App Router setup.
  - `api/`: Backend proxy routes (`search`, `details`) to hide API keys (if any) and handle CORS/Validation.
- `components/`: Atomic UI components (`TierBoard`, `MediaCard`, `SearchPanel`).
- `lib/`:
  - `hooks/`: Custom hooks for logic separation (`useTierList`, `useScreenshot`).
  - `server/`: Server-side only logic (MusicBrainz client).
  - `types.ts`: Centralized type definitions (`TierListState`, `MediaItem`).
