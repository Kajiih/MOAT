# Regular things to check, review or refactor

## Automated code quality checks

- Lint: `npm run lint`
- TypeScript: `npx tsc --noEmit`
- Format: `npx prettier . --write`

### Automated tests

- Unit tests: `npm run test -- --run`
- Playwright: `PLAYWRIGHT_HTML_OPEN='never' npx playwright test`
- Axe: `PLAYWRIGHT_HTML_OPEN='never' npx playwright test --axe`

## Global codebase review (every ~1 months)

Rules for global codebase review:

- Always run the automated code quality checks first.
- Always shows the pros and cons of any changes.

### General

- Outdated or legacy code (including tests, docs, etc.)
- Dependencie update or shift to a more modern/performant alternative
- Missing crucial tests
- Global audit of the codebase for potential improvements
- Specific audit focused on:
  - Performance
  - Accessibility
  - Security
  - SEO
  - UX
  - DX
- Implementation audits:
  - Project architecture
  - Repository structure
  - Data structures
  - Abstractions
  - Potential refactoring opportunities
  - Tests

## Specific audits

- Shortcuts logic/implementation
-
