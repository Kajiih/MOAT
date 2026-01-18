# Ambitious Improvements & Refactoring: Moat Tier List

This plan proposes a set of ambitious improvements to the Moat Tier List application, focusing on architectural elegance, performance, and "power user" features.

## Proposed Changes

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

#### "Moat Cloud" (Sharable Links)

- Concept: Move beyond JSON exports. Allow users to "Publish" their board.
- Architecture:
  - Integrate a lightweight DB (Supabase/PostgreSQL) or simple Blob storage (Vercel Blob).
  - Generate short codes (e.g., moat.app/b/x9z2p).
- Read-Only View: A lightweight page rendering just the TierBoard for sharing on social media (OG Images included).
- Ambition Level: High (Requires backend infra setup).

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

- Somehow reuse components for OG board, or at least centralize the place where components are defined to improve locality of behavior.
- Check how favicon is handled
- Check hooks and user vs server side components
- Check how keyboard shortcut are handled

- Improve dashboard
- Make default page an empty tierlist, not dashboard
- Fix lints, check the following plugins and config:
  - Maybe remove: 'jsdoc/require-param': 'off',
  - Check:
    - 'typescript-eslint'

```
Here are the best ESLint extensions to add to your flat config:

1. eslint-plugin-perfectionist
This is the modern replacement for simple-import-sort. It doesn't just sort imports; it can sort everything: objects, types, interfaces, enums, and JSX props.

Why for you: It keeps your data structures (like your music metadata or tier colors) perfectly sorted alphabetically or by line length automatically.

Config snippet: perfectionist.configs['recommended-natural']

2. eslint-plugin-unicorn
Known as the "more than 100 useful rules" plugin. It forces modern JavaScript patterns (e.g., preferring node.append() over node.appendChild() or for...of over forEach).

Why for you: Since you’re coming from a CSE/C++ background, this helps you lean into the most efficient and "clean" modern JS idioms. It catches subtle bugs that standard linters miss.

4. eslint-plugin-sonarjs
This brings "SonarQube" level static analysis to your local environment. It detects Code Smells (complex logic, cognitive complexity, code duplication).

Why for you: In CV/ML work, logic can get dense. SonarJS will warn you if a function is becoming too complex to test or maintain reliably.

Updated eslint.config.mjs with the "Power" Setup
JavaScript
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import jsdoc from 'eslint-plugin-jsdoc';
import perfectionist from 'eslint-plugin-perfectionist';
import unicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  perfectionist.configs['recommended-natural'],
  unicorn.configs['flat/recommended'],

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      jsdoc,
      'unused-imports': unusedImports,
    },
    rules: {
      // JSDoc Rules
      'jsdoc/require-file-overview': ['error', { tags: { file: { initial: true }, description: { initial: true } } }],

      // Auto-remove unused imports
      'unused-imports/no-unused-imports': 'error',

      // Tone down some Unicorn rules if they are too noisy
      'unicorn/prevent-abbreviations': 'off', // Sometimes we like 'props' or 'params'
    },
  },

  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
```
