# `/items` - The Content Primitive

The **Item** domain defines the universal visual identity of an entity (a Game, a Movie, etc.) across the Moat application.

## Core Responsibilities

1. **Visual Consistency (`ItemCard`, `SkeletonCard`)**: Defines the unified dimensional constraints (`ITEM_CARD_DIMENSIONS`) ensuring items flow perfectly between Search Panels and Virtual Grids without layout thrashing.
2. **Image Resolution (`ItemImage`)**: Manages intelligent, multi-fallback image resolution strategies leveraging the `ItemRegistryProvider`.
3. **Deep Metadata (`DetailsModal`)**: Houses the presentation layer for rich, asynchronous entity descriptions and tags.

## Guidelines

- Components in this directory must remain **Agnostic**. An `ItemCard` should only ever care about rendering generic `Item` types, never knowing if it's currently displaying a RAWG Game or an OpenLibrary Book.
