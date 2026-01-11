# Project Guidelines: MOAT - Tier List App

- Information about the app is available in README.md
- docs/ARCHITECTURE.md contains information about the architecture of the app.
  - You should look at this file when you need context about the app or a specific feature/implementation.
  - Always update this file after implementing a new feature or making a change.
- You should lint your code, use `npm run lint`, we have a strict code quality requirements.
  - Lints should not be ignored with comments unless it is the best solution for idiomaticity, simplicity, performance, clarity, maintainability and scalability
- You can and should write tests when if they are relevant. We use vitest.
  - Don't write tests if it is not relevant or trivial.
  - Use `npm test -- --watchAll=false` to run tests.
- We also use integration tests with playwright.
  - You can implement integration test if they are relevant.
  - Use `npx playwright test` to run tests.

- Write documentation to important or not trivial units of code, including modules, functions, variables, etc.
- Always follow best practices, and focus on idiomaticity, simplicity, performance, clarity, maintainability and scalability.
  - Always adhere to the single source of truth principle for repeated feature, formatting, etc.
  - Never use a short term solution, always target long term solutions and improvements.
  - Don't hesitate to refactor smaller or larger pieces to improve idiomaticity, simplicity, performance, clarity, maintainability and scalability.
