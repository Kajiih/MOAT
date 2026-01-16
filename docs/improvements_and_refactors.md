# Ambitious Improvements & Refactoring: Moat Tier List

This plan proposes a set of ambitious improvements to the Moat Tier List application, focusing on architectural elegance, performance, and "power user" features.

## Proposed Changes

### 1. Architectural Simplification & Logic Extraction

**Goal**: Reduce the complexity of `TierListContext.tsx` and the monolithic `reducer.ts`.

#### [MODIFY] [TierListContext.tsx](file:///Users/paquerot/Perso/dev_projects/tierlist/components/TierListContext.tsx)
- Extract the logic for grouping `actions`, `ui`, `history`, and `dnd` namespaces into a helper hook or utility.
- Use a more declarative pattern to register actions, reducing the "plumbing" code in the render function.

#### [MODIFY] [reducer.ts](file:///Users/paquerot/Perso/dev_projects/tierlist/lib/state/reducer.ts)
- Refactor the monolithic reducer into "slices":
  - `tierReducer`: Handles structural changes (ADD_TIER, DELETE_TIER, etc.).
  - `itemReducer`: Handles item movements and updates.
  - `globalReducer`: Handles title updates and global state overrides.
- This improves maintainability and allows for more granular unit testing.

---

### 2. Feature: Visual Board Themes

**Goal**: Elevate the "premium" feel of the app by allowing users to choose from distinct visual styles.

#### [NEW] [ThemeEngine.tsx](file:///Users/paquerot/Perso/dev_projects/tierlist/components/ui/ThemeEngine.tsx)
- Create a theme provider that manages visual "skins" (e.g., **Neo-Brutalism**, **Glassmorphism**, **Vintage Vinyl**).
- Themes will affect shadows, borders, typography, and even `MediaCard` rendering styles.

#### [MODIFY] [TierBoard.tsx](file:///Users/paquerot/Perso/dev_projects/tierlist/components/board/TierBoard.tsx)
- Update components to consume theme-specific CSS variables or variants.

---

### 3. Feature: Smart Discovery & Synergy Hub

**Goal**: Make the board building process proactive rather than reactive.

#### [NEW] [DiscoveryPanel.tsx](file:///Users/paquerot/Perso/dev_projects/tierlist/components/search/DiscoveryPanel.tsx)
- A new sidebar (or addition to `SearchPanel`) that suggests items based on the current board content:
  - "Missing from this Artist": Shows top albums/songs from artists already on the board that haven't been added.
  - "Related Artists": Leverages MusicBrainz relations to suggest similar artists.
  - "Genre Deep Dive": Suggests quintessential albums from the most prominent genres on the board.

#### [MODIFY] [useBackgroundEnrichment.ts](file:///Users/paquerot/Perso/dev_projects/tierlist/lib/hooks/useBackgroundEnrichment.ts)
- Enhance the hook to not only fetch metadata but also populate a "Suggestions" state in a new `DiscoveryContext`.

---

### 4. Performance: Batch Registry Updates

**Goal**: Optimize `IndexedDB` interactions for large-scale operations.

#### [MODIFY] [MediaRegistryProvider.tsx](file:///Users/paquerot/Perso/dev_projects/tierlist/components/MediaRegistryProvider.tsx)
- Implement `registerItems(items: MediaItem[])` for batch updates.
- Use a single transaction for multiple updates during imports or initial hydration.

---

## Verification Plan

### Automated Tests
- **Unit Tests**:
  - Run `npm run test` to ensure existing tests pass.
  - Add new unit tests for the "slice" reducers.
- **Integration Tests**:
  - Run `npx playwright test` to verify that the core drag-and-drop and search flows still work with the refactored context.

### Manual Verification
1.  **Theme Switching**: Verify that switching themes instantly updates the UI without re-renders affecting performance.
2.  **Discovery Panel**: Add several artists to the board and verify that the "Discovery Panel" correctly suggests related entities.
3.  **Large Import**: Import a JSON file with 100+ items and verify the `MediaRegistry` handles it efficiently via the batch update mechanism.
