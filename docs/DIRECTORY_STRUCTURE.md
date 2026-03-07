# Directory Structure

This document describes the organization of the **Moat** codebase. For terminology, see the [Glossary](GLOSSARY.md).

The project follows a **domain-driven, flat structure** inside the `src/` directory to maximize **Locality of Behavior** (LoB). Everything related to a specific domain (components, hooks, schemas, state) lives together.

## Root Directories

- **`src/`**: The entire application source code.
- **`docs/`**: Architectural and project documentation.
- **`e2e/`**: Playwright end-to-end tests.
- **`public/`**: Static assets.
- **`scripts/`**: Operational scripts (if any).

## The Source Directory (`src/`)

### App Shell & Routing
- **`src/app/`**: The Next.js App Router (Routes and API route handlers ONLY).
    - `_components/`: Global app shell components (Header, Footer).

### Core Domains
Each core domain is self-contained and owns its UI, business logic, state, and type contracts.

- **`src/board/`**: (Glossary: Board, Tier) The core workspace experience.
    - Contains: Tier UI, Drag & Drop logic, Board state/reducers, Export functionality, and specialized hooks.
- **`src/items/`**: (Glossary: Item) The fundamental unit of content.
    - Contains: Item visualizations (`ItemCard`, `DetailsModal`), item domain schemas, and image resolution logic.
- **`src/search/`**: (Glossary: Search & Discovery) How new items are found.
    - Contains: Search panels, filter configurations, sorting logic, and consumer-side schemas (SearchParams).
- **`src/providers/`**: (Glossary: Provider) External data sources.
    - Contains: Provider/Entity contracts, the centralized item Registry, the `secureFetch` client, and subdirectories for source-specific implementations (e.g., `adapters/rawg/`).
- **`src/storage/`**: IndexedDB persistence abstractions.
    - Contains: `storage.ts` backend wrapper and local-storage syncing hooks.

### Infrastructure & Shared
- **`src/lib/`**: Cross-domain, tiny infrastructure.
    - Contains: Color themes, logger, global utility pure functions (ID generation, comparisons).
    - `ui/`: Truly generic, pure UI primitives (e.g., `Popover`, `ToastProvider`) and DOM hooks (`useClickOutside`).
- **`src/test/`**: Test infrastructure, MSW setup, and Vitest factories.
