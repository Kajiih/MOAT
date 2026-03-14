# 🏰 Moat

**Moat** is a premium, high-performance universal media tier list builder. It combines a seamless drag-and-drop experience with a strictly-typed, pluggable **Generic Provider Architecture** capable of deeply enriching metadata from any external API (RAWG, TMDB, MusicBrainz, etc.).

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

## 📐 Documentation

Detailed engineering documentation is available in the `docs/` directory:
- [Testing & Diagnostics](docs/TESTING.md)
- [Provider Data Architecture](docs/PROVIDERS.md)
- [Directory Structure](docs/DIRECTORY_STRUCTURE.md)
- [Glossary](docs/GLOSSARY.md)
