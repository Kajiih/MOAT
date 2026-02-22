# Ambitious Improvements & Refactoring: Moat Tier List

This plan proposes a set of ambitious improvements to the Moat Tier List application, focusing on architectural elegance, performance, and "power user" features.

## Fixes

- Fix pagination prefetching: Currently it only prefetches one page and when go the the next page, it doesn't prefetch the next one.
- Prefetch should be active unless the mouse is in the search/filter section (the card grid doesn't count).
  - We need to separate properly the top of the search and the rest with the results that should activate the prefetch.
- Or maybe we just use a delay before prefetching?

## Proposed Changes

### 1. Refactor missing image handling: no image should be a first class citizen

- Missing images are currently handled by a client-side set `failedImages`. This is not ideal because it's not persistent and it's not shared across devices.
- We can use a server-side cache for missing images. This would allow us to share the cache across devices and make it persistent (can be useful for the screenshot engine or shared boards, og images, etc)
- We can also use a client-side cache for missing images. This would allow us to avoid repeated fetch attempts during the session.
- Do we really need both?
- We should probably use a more robust solution for this, like a database or a key-value store.
- We can also track the state of the image along with the data of the item card so we don't try to fetch the image again if it failed once.
- Single coherent way to handle missing images across the app (ui, screenshot engine, etc) including default/backup images.
- Maybe we can refactor the whole image handling logic to be more robust and efficient.

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

### Other ideas

#### New Feature: "Command Palette" (Cmd+K)

- Concept: Replace or augment the static "Shortcuts Modal" with a fully interactive Command Palette (like in VS Code, Linear, or Spotlight).
- Functionality: Users can press Cmd+K to:
  - Search for items (unifying the search panel).
  - Execute global actions (Clear Board, Export, Randomize Colors).
  - Navigate (Undo/Redo).
- Why Ambitious? This is the hallmark of "professional-grade" productivity tools. It makes the app feel incredibly fast and power-user friendly.

#### Smart "Discovery" Engine

- Current State: Users search manually.
- Proposal: Add a "Suggested Items" feature. When a user adds an artist to "S Tier", fetch related artists (via MusicBrainz relations) and suggest them in the Search Panel.
- Implementation: specific API endpoint leveraging artist-relations from MusicBrainz.

#### "Jukebox Mode" (Audio Previews)

- Concept: It's a music tier list, but you can't hear the music.
- Implementation:
  - Add a "Play" button to MediaCard on hover.
  - Integrate Spotify Widget API or YouTube IFrame API.
- Search logic: Use the MusicBrainz ID -> ISRC mapping to find the track on streaming services.
- Ambition Level: Medium (API integration complexity).

#### "Alignment Chart" Mode

- Concept: Break free from the 1D list.
- Implementation:
  - Add a toggle to switch the board view to a 2D Axis (e.g., "Underrated vs Overrated" on X, "Good vs Bad" on Y).
  - Leverage existing DnD logic but map to {x, y} coordinates instead of {tierId, index}.

#### Import from Spotify / Apple Music

- Current State: Manual search via MusicBrainz only.
- Proposal: Add an "Import Playlist" feature.
- Why: Drastically reduces friction. Users can import their "Top 2024" playlist and immediately start ranking.
- How:
  - Create a client-side Spotify integration (Client Credentials flow or implicit grant).
  - Fetch playlist tracks and "resolve" them to MusicBrainz entities using your existing fuzzy search logic.

#### Collaborative "Live" Mode

- Current State: Local-only.
- Proposal: Enable real-time collaboration via a shareable URL.
- Why: "Rank these albums with me" is a strong use case for streamers or friends.
- How:
  - Use a service like PartyKit or Liveblocks, or roll a simple WebSocket server.
  - Sync the Action objects dispatched in reducer.ts across clients.

#### Server-Side Social Previews (OG Images)

- Current State: html-to-image for client-side export.
- Proposal: Dynamic Open Graph images.
- Why: When a user shares their board link (if we implement #1), the preview card on Twitter/Discord should show their actual tier list, not a generic logo.
- How:
  - Use @vercel/og (Satori).
  - Create an API route /api/og?boardId=... that renders a simplified version of the board on the edge.
  - Note: Requires creating a specific "OGBoard" component optimized for Satori (Flexbox only, no complex CSS/Grid).

## Smaller fixes or improvement ideas:

- Rework OG board to use a centralized component, better visually (the logo and moat.app is not right) and fix the fact that sometimes images are considered as missing when they should not (maybe too short timeout)

- Somehow reuse components for OG board, or at least centralize the place where components are defined to improve locality of behavior.
- Check how favicon is handled
- Check hooks and user vs server side components
- Check how keyboard shortcut are handled

- Improve dashboard
  - Miniature preview: Make sure that we reuse elements with the tierlist/screenshot preview board when possible

```
Here are the best ESLint extensions to add to your flat config:

1. eslint-plugin-perfectionist
This is the modern replacement for simple-import-sort. It doesn't just sort imports; it can sort everything: objects, types, interfaces, enums, and JSX props.

Why for you: It keeps your data structures (like your music metadata or tier colors) perfectly sorted alphabetically or by line length automatically.

Config snippet: perfectionist.configs['recommended-natural']

```

## Rendering and optimization check

- Check what is re-rendered each time we do something/modify the board
- Check if we can optimize the rendering to only render what is necessary, if relevant
- Selector Pattern?

# New Ideas

## Multi-tab protection

If a user opens the same board in two tabs, "Last Write Wins." There is no locking or conflict detection. Proposed Fix: Implement a Sequence Clock or Vector Clock.

Logic: Each state update increments a version.
useStorageSync
checks version before writing. If the DB version is higher than our hydrated version + local changes, trigger a "Reload Required" toast.

## Auto Save to disk

Auto-saving to disk in case user forgets to save and browser loses data

### AI says

This is a great request. You want to implement an "Auto-export to disk" feature to protect users from data loss if the browser clears IndexedDB or crashes catastrophically.

Basically, you want a periodic, automatic JSON export to the user's hard drive.

The Problem
Traditional web apps cannot "auto-save to disk" silently without user interaction due to browser security models (FS Access API usually requires a user gesture). However, we can use the File System Access API (if supported) to request permission once to save to a specific file handle, and then write to it periodically.

Proposed Solution: "Continuous Backup"
UI: Add a "Enable Auto-Backup" button in the header or settings.
Permission: When clicked, use window.showSaveFilePicker() to ask the user where to save the backup (e.g., backup.json).
Persistence: Store this FileSystemFileHandle in IndexedDB.
Loop: Every X minutes (or on save), if we have a valid handle, write the
ExportData
JSON to that file handle silently.
Constraint: The File System Access API is powerful but has browser support limitations (mainly Chromium). For Firefox/Safari, we might fall back to just manual exports or a "Download Backup" reminder.

## Also
E. Simplicity: Custom "Hydration" Event
Current Issue: Components like
SearchPanel
use isHydrated to hide/show parts of the UI, which can cause layout shifts. Proposed Fix: Move INITIAL_STATE merging into the Server Layer (via a Next.js API route that speculatively loads from IDB) or use a Loading Strategy Provider.

Here is a breakdown of moving local persistence (like activeType, showAdded, fuzzy) from components like
SearchPanel
into a centralized
UserPreferencesProvider
.

✅ Benefits (UX & Consistency)
Eliminates Layout Shifts ("Pop-in"):
Current: The main app loads -> The Search Panel mounts -> activeType hydrates a few ms later -> The tab switches from "Album" (default) to "Artist" (saved). This visible flicker feels unpolished.
Proposed: The app enters a "Loading" state until both the Board Data and User Preferences are fully loaded. When the UI appears, it is instantly in the correct state.
Single Source of Truth:
You have one place to inspect default values (
UserPreferencesProvider
) rather than hunting through individual components to find where moat-search-fuzzy is defined.
Component Purity:
SearchPanel
becomes a cleaner "dumb" component that just receives props (e.g., isFuzzyEnabled) rather than managing its own IndexedDB lifecycle. This makes it easier to test and storybook.
Cross-Component Access:
If you later decide that another component (e.g., a "Quick Filter" in the Header) needs access to the fuzzy setting, it's already available in the context. You don't need to prop-drill or duplicate hooks.
⚠️ Drawbacks (Complexity & Performance)
Increased "Time to First Paint":
Current: The user sees the board immediately, while the search panel might flicker slightly later.
Proposed: The user stares at the "Loading..." spinner for slightly longer (waiting for secondary preferences to load).
Mitigation: IndexedDB is fast (<50ms usually), so this is likely imperceptible, but it is technically a blocking dependency.
Complexity with Dynamic Keys:
activeType is currently scoped by category (moat-search-active-type-${category}).
In a local component, this is easy:
usePersistentState(key)
.
In a global provider, you must carefully structure the state (e.g., activeTypes: Record<Category, MediaType>) to handle all possible board categories. This adds boilerplate logic to the provider that was previously simple and co-located.
Over-Abstration:
If a setting is truly only used in
SearchPanel
.tsx (like activeType), moving it to a global Context can feel like "Global Variable" pollution. It increases the cognitive load of the global context for data that is locally scoped.
Recommendation
I recommend a hybrid approach:

Move Global Toggles: Move fuzzy, wildcard, showAdded, and showAdvanced to
UserPreferencesProvider
. These are truly global/user-wide settings.
Keep activeType Local: Since activeType depends on the current board's category (which changes as you navigate), keeping it local to
SearchPanel
avoids complex synchronization logic in the global provider. The layout shift from tabs is usually minimal compared to toggles appearing/disappearing.
Do you want to proceed with this hybrid centralization?
