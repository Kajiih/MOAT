# Architecture Mapping: V1 vs V2

This document categorizes the codebase into V1 (legacy), V2 (new), and Shared components to facilitate the transition to the Database-Centric architecture.

## Architecture Status Map

| Component / Path | Status | Plan | Notes |
| :--- | :--- | :--- | :--- |
| **`lib/database/`** | **V2 Only** | **Keep** | Core infrastructure for the new architecture. |
| `lib/database/types.ts` | V2 | Keep | Standard schemas (Zod). |
| `lib/database/registry.ts` | V2 | Keep | Provider registration system. |
| **`lib/media-types/`** | **V1 Only** | **Delete** | Static configuration for V1 services. |
| `lib/media-types/definitions/` | V1 | Delete | Individual JSON-like configs. |
| `lib/media-types/registry.ts` | V1 | Delete | Global registry for V1. |
| **`lib/services/`** (Root) | **V1 Only** | **Delete** | Legacy API adapters. |
| `lib/services/music/` | V1 | Delete | MusicBrainz (V1). |
| `lib/services/cinema/` | V1 | Delete | TMDB (V1). |
| `lib/services/books/` | V1 | Delete | OpenLibrary/Hardcover (V1). |
| **`lib/services/v2/`** | **V2 Only** | **Keep** | New Database Providers. |
| `lib/services/v2/rawg.ts` | V2 | Keep | Reference implementation. |
| **`components/search/`** (Root) | **V1 Only** | **Delete** | Legacy Search UI. |
| `components/search/SearchPanel.tsx` | V1 | Delete | Driven by `mediaTypeRegistry`. |
| `components/search/SearchTab.tsx` | V1 | Delete | Uses `useMediaSearch`. |
| `components/search/filters/` | V1 | Delete | V1-specific filter components. |
| `components/search/hooks/` | V1 | Delete | `useMediaSearch`, `useSearchFilters`. |
| **`components/search/v2/`** | **V2 Only** | **New** | New Search UI (Coming soon). |
| **`components/media/`** | **Shared** | **Keep** | Visual presentation. |
| `components/media/MediaCard.tsx` | Shared | Keep | V2 items are compatible with `MediaItem`. |
| `components/media/DetailsModal.tsx` | Shared | Keep | Needs minor updates for V2 details. |
| **`components/providers/`** | **Shared** | **Keep** | Core state management. |
| `TierListContext.tsx` | Shared | Keep | Stores board items. |
| `MediaRegistryProvider.tsx` | Shared | Keep | IndexedDB persistence. |
| **`lib/utils/`** | **Shared/V1** | **Mixed** | Utilities. |
| `lib/utils/ids.ts` | Shared | Keep | ID normalization logic. |
| `lib/utils/mappers.ts` | V1 | Delete | Transformation logic for V1 APIs. |
| **`app/api/`** | **Mixed** | **Refactor** | Backend proxies. |
| `app/api/search/` | V1 | Refactor | Will use `DatabaseRegistry` (SSR). |
| `app/api/details/` | V1 | Refactor | Will use `DatabaseRegistry` (SSR). |
| `app/api/proxy-image/`| Shared | Keep | Unified image proxying. |

## Key Differences

| Feature | V1 (Legacy) | V2 (New) |
| :--- | :--- | :--- |
| **Registry** | `mediaTypeRegistry` (Static) | `DatabaseRegistry` (Dynamic) |
| **Discovery** | Hardcoded in `definitions/` | Provider-driven (`entities`) |
| **Logic** | Scattered (Registry, UI, Service) | Centralized in `DatabaseProvider` |
| **Item Schema** | `MediaItem` (Loose) | `StandardItem` (Strict/Zod) |
| **Filtering** | UI-driven components | Declarative (`FilterDefinition`) |
| **Images** | `imageUrl` (Single) | `images` (Waterfall/Healing) |
| **Errors** | `throw new Error()` | `DatabaseError` (Typed) |

## Decommissioning Plan

1. **Parallel Run**: Implement V2 infrastructure in separate files (hooks, components).
2. **Flagged Activation**: Allow switching to V2 UI via feature flag or new route.
3. **Migration**: Move existing services (Music, Cinema) to `lib/services/v2/`.
4. **Final Cutover**: Make V2 the default UI and remove all files marked as **Delete**.
