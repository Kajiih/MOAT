# Features List: MOAT - Tier List App

## 1. Core Tier List Functionality

The heart of the application, focusing on the user's ability to create, organize, and manage tier lists.

- **Multi-Board System**:
  - **Dashboard**: Manage multiple independent tier lists from a central dashboard (`app/page.tsx`).
  - **Persistent Storage**: Each board is stored separately in `IndexedDB`.
  - **Dynamic Routing**: Unique URLs for each board (e.g., `/board/[id]`).
- **Drag & Drop Interface**:
  - **Fluid Interactions**: Powered by `@dnd-kit/core` and `@dnd-kit/sortable`.
  - **Accessible**: Supports keyboard and pointer sensors.
  - **Cross-Container Dragging**: Move items between the Search Panel, Tier Rows, and the "Bank".
- **Tier Management**:
  - **Customization**: Add, delete, move, and rename tiers.
  - **Styling**: Change tier colors using a defined semantic palette (`lib/colors.ts`).
  - **Randomization**: "Randomize Colors" feature to quickly restyle the board.
- **Undo/Redo System**:
  - **History Stack**: Full state replay capabilities for destructive actions (moves, edits, deletes).
  - **Keyboard Support**: Standard `Cmd+Z` / `Cmd+Shift+Z` shortcuts.
- **Items & Media**:
  - **Rich Media Cards**: Displays album art, artist photos, or song details.
  - **Details Modal**: Quick view for metadata (tracklists, release dates, tags).

## 2. Advanced Metadata Pipeline

Leverages external APIs to provide a rich, data-driven experience.

- **MusicBrainz Integration**:
  - **Search**: Smart fuzzy matching for Artists, Albums, and Songs.
  - **Filtering**: Advanced filters for Release Type (Album/EP/Single), Country, and Song Duration.
  - **Deep Metadata**: Background fetching of tracklists, artist bios, and release dates.
- **Global Media Registry**:
  - **Persistence**: A centralized `IndexedDB` based "Brain" that remembers every item seen.
  - **Self-Healing**: Automatically enriches items with better images or missing data in the background.
  - **Deduplication**: Ensures the same Album Art is used across different tracks from the same release.
- **Image Optimization Engine**:
  - **Resilience**: Waterfall fallback strategy (Fanart.tv -> Wikidata -> Cover Art Archive).
  - **Proxying**: Custom API routes (`/api/proxy-image`) to bypass CORS and handle 3rd party image hotlinking protection.
  - **Background Fetch**: Automatically finds artist images if they are missing from the initial search.

## 3. Sharing & Exporting

Features designed for social sharing and portability.

- **High-Fidelity Export**:
  - **PNG Generation**: Uses `html-to-image` to create pixel-perfect screenshots of the board.
  - **"Clean Room" Rendering**: dedicated `ExportBoard` component ensures exports are free of UI clutter (scrollbars, buttons).
  - **Branding**: Automatically adds the Board Title and a "MOAT" logo to the export.
- **Share Functionality**:
  - **Shared Views**: Read-only view for shared boards (implied by `components/share/SharedBoardView.tsx`).
  - **Open Graph Images**: Dynamic OG images generated via `@vercel/og` (Satori) for rich social media cards.
- **Data Portability**:
  - **JSON Import/Export**: Full board state export including all metadata, allowing for backup or transfer between devices.

## 4. UI/UX & Design System

Aesthetic and usability features.

- **Dynamic Branding**:
  - **Adaptive Favicon**: Browser tab icon changes color based on the board's top tiers.
  - **Adaptive Logo**: The "MOAT" logo cycles through the board's color palette.
  - **Theme Consistency**: `useBrandColors` ensures UI elements (Headings, buttons) match the current board's vibe.
- **Responsiveness**:
  - **Virtualization**: Uses `@tanstack/react-virtual` for handling large lists (search results, massive tiers) without performance loss.
  - **Mobile Optimized**: Touch-friendly drag interactions and responsive layouts.
- **User Feedback**:
  - **Toast Notifications**: Non-intrusive alerts for success/error states `components/ui/Toast.tsx`.
  - **Loading States**: Skeleton loaders and spinners during data fetching.
  - **Shortcuts Modal**: Visual guide for all keyboard commands.

## 5. Technical & Developer Experience

Under-the-hood features that ensure stability and maintainability.

- **Architecture**:
  - **Next.js App Router**: Modern React Server Components architecture.
  - **Layered State**: Separates UI state (React Context) from Domain data (IndexedDB).
  - **Service Layer**: Modularized API logic for maintainable external integrations.
- **Testing**:
  - **Unit Tests**: `Vitest` for logic and hook testing.
  - **E2E Tests**: `Playwright` for full browser automation testing.
