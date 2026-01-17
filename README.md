# 🎹 Moat

**Moat** is a premium, high-performance music tier list builder. It combines a seamless drag-and-drop experience with deep metadata enrichment powered by MusicBrainz.

## ✨ Key Features

- **Deep Search**: Find albums, artists, and songs with precise filtering (year, type, artist context).
- **Persistent Global Library**: Every encountered item and its high-res image is remembered across sessions.
- **Background Enrichment**: As you build your board, a background worker automatically fetches tracklists, tags, and artist bios.
- **Zero-Latency UI**: Stored metadata opens instantly in the detail modal, even after a page refresh.
- **Dynamic Branding**: The favicon and app theme automatically adapt to the colors of your top-tier items.
- **Full Portability**: Export your boards as high-quality PNGs or portable JSON files that preserve all metadata.

## 🛠️ Technology Stack

- **Frontend**: Next.js (App Router), React 19, Tailwind CSS v4.
- **Drag & Drop**: `@dnd-kit`.
- **Data Fetching**: SWR (Stale-While-Revalidate).
- **Metadata APIs**: MusicBrainz, Fanart.tv, Wikidata.
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

**Unit & Integration Tests**:

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

Detailed engineering documentation is available in the [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) file.
