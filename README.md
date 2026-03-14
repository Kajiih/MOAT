# 🏰 Moat

**Moat** is a premium, high-performance universal media tier list builder. It combines a seamless drag-and-drop experience with a strictly-typed, pluggable **Generic Provider Architecture** capable of deeply enriching metadata from any external API (e.g., RAWG for video games).

## ✨ Key Features

- **Generic Provider System**: Seamlessly swap or aggregate search endpoints. Every media source maps securely to a native, statically verified abstraction.
- **Deep Search**: Find items natively with precise filtering and edge-case pagination handling dynamically constructed by the current provider.
- **Persistent Global Library**: Every encountered item and its high-res image is remembered securely across sessions via IndexedDB caching.
- **Background Enrichment**: As you build your board, background resolvers automatically fetch detailed tags, descriptions, and high-quality references.
- **Zero-Latency UI**: Stored metadata opens instantly in the detail modal, even after a page refresh.
- **Full Portability**: Export your boards as high-quality PNGs or portable JSON files that preserve all deep metadata.

## 🛠️ Technology Stack

- **Frontend**: Next.js (App Router), React 19, Tailwind CSS v4.
- **Drag & Drop**: Pragmatic Drag and Drop (`@atlaskit/pragmatic-drag-and-drop`).
- **Data Fetching**: Custom fetcher with exponential backoff and `Retry-After` header support. Overlaps with native React 19 `<Suspense>` bounds. 
- **Data Layers**: `idb-keyval` for Async Persistence. Zod for absolute API safety.
- **Testing**: Vitest, React Testing Library, Playwright.

## 🚀 Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 🧪 Running Tests

**Unit & Generic Integration Tests**:
Moat features a massive generic integration loop to ensure absolute backend fidelity.

```bash
npm run test
```

**End-to-End & Visual Tests**:

```bash
npx playwright test
```

To update visual snapshots after intentional UI changes:

```bash
npx playwright test --update-snapshots
```

## 🗂️ Directory Structure

Global project terminology is maintained in [`docs/GLOSSARY.md`](docs/GLOSSARY.md).

Rather than centralized documentation, each core domain maintains its own local `README.md` explaining its constraints, architectures, and guidelines.

*   [`e2e/`](./e2e/README.md) - Playwright End-to-End Tests & Critical User Journeys (CUJs)
*   [`src/app/`](./src/app/README.md) - The Next.js Application Shell (Routes & Global UI)
*   [`src/board/`](./src/board/README.md) - The Work Surface (Tier Grid, Drag & Drop, Redux)
*   [`src/items/`](./src/items/README.md) - The Content Primitive (Universal Models, Image Caching)
*   [`src/search/`](./src/search/README.md) - The Discovery Engine (Filters, Sorting, Panels)
*   [`src/providers/`](./src/providers/README.md) - The Generic Provider Architecture (Adapters, Live APIs)
*   [`src/storage/`](./src/storage/README.md) - IndexedDB Persistence Hub
*   [`src/lib/`](./src/lib/README.md) - Shared Infrastructure (Generic UI, Tools)
*   [`src/test/`](./src/test/README.md) - Diagnostics Engine (MSW, Guardrails)

