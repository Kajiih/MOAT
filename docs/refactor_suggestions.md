1. Refactor TierListApp to use Context for Handlers
  Current State: TierListApp extracts ~30 properties/functions from useTierList and passes them down manually to TierBoard, Header, and SearchPanel. This is classic "Prop Drilling."
  Improvement:
   * Move the useTierList logic inside the TierListProvider or create a new TierListLogicProvider.
   * Components like Header and TierBoard can then consume useTierListContext() (or a new hook) directly to access undo, redo, handleAddTier, etc.
   * Result: TierListApp becomes a clean layout component with almost no logic, just JSX structure.

2. Simplify SearchPanel Tab Management
  Current State: SearchPanel manually instantiates three <SearchTab> components (Album, Artist, Song) and toggles their visibility with isHidden. It also manages activeType state.
  Improvement:
   * Create a configuration array: SEARCH_MODES = [{ type: 'song', icon: Music }, ...].
   * Map over this array to generate the buttons and the tab content.
   * This removes the repetitive code block for rendering the 3 tabs and makes adding a new type (like "playlist" or "book" later) a one-line config change.

3. Decouple useTierList Facade
  Current State: useTierList.ts is a massive "God Hook" that aggregates DnD, IO, Structure, and Utils. While it's a facade, it still returns a huge object with ~40 properties.
  Improvement:
   * Keep useTierList as the main entry point, but group the return values.
   * Return { state, actions: { ...structureActions, ...ioActions }, dnd: { ... } }.
   * This makes the consuming code (or the Context provider from suggestion #1) much cleaner to read and autocomplete.
