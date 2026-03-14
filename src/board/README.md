# `/board` - The Work Surface

The **Board** domain encapsulates the visual tier list editor and its underlying state engine. This is the primary user-facing arena for organization and curation.

## Architecture

This domain operates via a strict separation of concerns, managed primarily by the `TierListContext`:
1. **Presentation (`TierBoard`, `TierGrid`)**: Declarative React UI rendering rows, tiers, and Virtual Grids optimized for massive datasets.
2. **Interaction (`Drag & Drop`)**: Uses `@atlaskit/pragmatic-drag-and-drop` to calculate native movement of Items across Tiers seamlessly. 
3. **State Management (`state/reducer.ts`)**: Pure Redux Toolkit slices that mutate board properties (Undo/Redo, Title changes, Movement logic).

## Guidelines
* **No Direct Data Fetching**: The board visualizes items. It relies on the generic `Provider` layers and `Item` components to fetch and resolve rich metadata.
* **Locality of Behavior**: Unique hooks (like `useScreenshot` or `useTierStructure`) specific only to the board lifecycle live here, avoiding global `lib/` bloat.
