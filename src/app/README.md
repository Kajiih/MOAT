# `/app` - The Application Shell

This directory contains the Next.js App Router boundaries and the global application shell components.

Following **Locality of Behavior (LoB)**, this domain strictly manages global routing layout and high-level styling wrappers. It **must not** contain complex business logic or domain models belonging to other core domains (e.g., Board, Items, Providers).

## Contents

- `layout.tsx` / `page.tsx`: Next.js Server Components forming the root HTML mounting points.
- `globals.css`: Tailwind entry point containing crucial static CSS variables and base layers.
- `_components/`: Pure layout primitives shared across routes.
  - `Header.tsx`: Global navigation and interaction hub.
  - `Footer.tsx`: Global application footer.
