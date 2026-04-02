# Moat Testing Strategy

This document outlines the testing strategy, standards, and organization for the Moat application.

## 📐 Testing Pyramid

We classify tests into four main categories, ordered by speed and isolation level:

### 1. Unit Tests (`*.test.ts`)
- **Scope**: Pure functions, utility modules, Redux reducers, schema validations.
- **Environment**: Node / JSDOM (Vitest).
- **Location**: Colocated adjacent to the source file (e.g., `src/core/utils/colors.test.ts`).
- **Focus**: Algorithmic correctness, edge cases, data transformation.

### 2. Component Tests (`*.test.tsx`)
- **Scope**: React components and Custom Hooks.
- **Environment**: JSDOM (Vitest + Testing Library).
- **Location**: Colocated adjacent to the component or hook.
- **Focus**: User interactions (clicks, keyboard), rendering logic, state changes.
- **Abstractions**: Use standard `src/test/utils.tsx` (e.g., `renderWithProviders`) to avoid boilerplate mocking of standard providers (Redux, Router, Toast).

### 3. Integration Tests
We distinguish between two types of integration tests:

#### A. Component Integration Tests (`*.test.tsx`)
- **Scope**: Multi-component state flows (e.g., `TierListApp.test.tsx` or `SearchTab.test.tsx`).
- **Environment**: JSDOM (Vitest + Testing Library).
- **Focus**: Verifying that components talk to each other correctly, state transitions are synchronized, and contexts provide correct data.
- **Guardrail**: Network requests MUST be mocked (e.g., via MSW or `vi.mock` on hooks). Complex behaviors like drag-and-drop combined with modal state should be deferred to E2E tests if JSDOM limitations cause flakiness.

#### B. Service Integration Tests (`*.integration.test.ts`)
- **Scope**: Cross-cutting features, data persistence layers, external API adapters.
- **Environment**: Node (Vitest) - **Explicitly allowed to bypass the global network guard**.
- **Location**: Relevant feature integration folder or adjacent to the service.
- **Focus**: Real-world integration (e.g., live API responses for Providers, IndexedDB roundtrips).

### 4. End-to-End (E2E) Tests (`e2e/*.spec.ts`)
- **Scope**: Critical User Journeys (CUJs), visual regressions, complex workflows.
- **Environment**: Real Browser (Playwright).
- **Location**: `e2e/` directory.
- **Focus**: Multi-page flow, visual consistency, drag-and-drop fidelity.

---

## 🛡️ Best Practices & Guardrails

### 🚫 Global Network Guard
All unit and component tests are **strictly isolated from the internet**.
If you attempt to call `fetch` in a unit test without a mock, it will hard-fail.
- To use real network requests, ensure your file ends with `.integration.test.ts`.
- Otherwise, use `vi.spyOn(global, 'fetch')` or MSW to intercepted network traffic.

### 🏭 Semantic Factories
Use `src/test/factories.ts` to generate mock data.
Avoid using purely random `Faker` data for complex state edge-cases. Prefer scenario-based fixtures that replicate known user states.

### 🧩 Single Source of Truth for Mocks
Do not redefine standard mocks (like `useRouter` or `ToastState`) inside individual test files if they can be shared. Update `src/test/utils.tsx` or `setup.tsx` to provide global defaults.

---

## 🏃 Commands

```bash
# General Unit + Component Test Mode (Safe, Fast)
npm run test

# Run Integration Tests (Hits live APIs, pulls quotes)
npm run test:integration -- --run

# Run Everything
npm run test:all

# Playwright E2E
npx playwright test
```
