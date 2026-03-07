# Moat Glossary

This document defines the core terminology used across the **Moat** application. It establishes a shared language for developers and helps maintain consistency between the data model, UI components, and documentation.

## Core Concepts

### 1. Board
The top-level workspace representing a single tier list project (e.g., "Best RPGs of 2024"). It encompasses the collection of tiers, the items within them, and global metadata like the title and branding.

### 2. Tier
A horizontal categorization row on the **Board**. Each tier is defined by a label (e.g., 'S', 'A') and a semantic color. It acts as a container for **Items**.

### 3. Item
The fundamental unit of content on a **Board**. An **Item** represents a specific piece of media (a Game, an Album, a Book, etc.).
- **Item**: The universal format that supports diverse data sources and rich metadata.
- **Legacy Item (V1)**: The previous format (Album, Artist, Song), now isolated in the `v1/` namespace.

### 4. Entity
A classification of **Items** within a **Provider**. For example, the "RAWG" Provider exposes entities like "Game", "Developer", and "Franchise". Each entity defines its own unique filters, sorting options, and UI branding.

### 5. Provider
An external database service that supplies data to the app (e.g., RAWG, MusicBrainz, TMDB, Open Library).

---

## UI Components

### 1. Board & Tierlist
- **Board**: The top-level visual container for a tier list project.
- **Board Title**: The editable name of the board (e.g., "Favorite Movies").
- **Tier List**: The vertical stack of tiers.
- **Tier Row**: A single horizontal categorization unit.
- **Tier Header**: The left-side label and color-coded area of a Tier Row.
- **Tier Grid**: The interactive zone within a Tier Row where items are placed. Supports virtualization for performance.
- **Tier Settings**: The modal/interface for editing a Tier's label and color.

### 2. Item Visualization
- **Item Card**: The visual tile representing a **Standard Item** or **Legacy Item**.
- **Item Image**: The specialized image component with "waterfall" resolution.
- **Details Modal**: The overlay showing rich metadata, tracklists, or descriptions for an Item.

### 3. Search & Discovery
- **Search Panel**: The primary sidebar for discovering new items.
- **Item Picker**: (Formerly ItemPicker) The component managing tabs for different **Providers** and **Entities**.
- **Search Tab**: A specific entity-focused view (e.g., "Games", "Developers").
- **Search Filters**: The sidebar/popover for refining search results via **Entity**-specific parameters.
- **Search Results**: The grid of newly discovered items ready to be added to the **Board**.

---

## Technical Terminology

### 1. Item Registry
A persistent, service-wide cache (stored in IndexedDB) that remembers every **Item** the user has encountered. It ensures metadata and images persist across different boards and sessions.

### 2. Identity
A composite identifier that uniquely routes an **Item** to its source.
For example: `${databaseId}:${entityId}:${dbId}`.

### 3. Resolver
A hook or service that takes an **Identity** or **Image Reference** and asynchronously retrieves the corresponding data or URL.
