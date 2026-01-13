# Project Guidelines: MOAT - Tier List App

- Information about the app is available in README.md
- The [app's architecture documentation](docs/ARCHITECTURE.md) contains information about the architecture of the app.
  - When you start working, look at this file to learn context about the app and specific features/implementations.
  - Always update this file after implementing a new feature or making a change.
- You should lint your code, use `npm run lint`, we have a strict code quality requirements.
  - Lints should not be ignored with comments unless it is the best solution for idiomaticity, simplicity, performance, clarity, maintainability, scalability and locality of behavior
- You can and should write tests when if they are relevant. We use vitest.
  - Don't write tests if it is not relevant or trivial.
  - Use `npm run test -- --run` to run tests.
- We also use integration tests with playwright.
  - You can implement integration test if they are relevant.
  - Use `npx playwright test` to run tests.

- Write documentation to important or not trivial units of code, including modules, functions, variables, etc.
- Always follow best practices, and focus on idiomaticity, simplicity, performance, clarity, maintainability, scalability and locality of behavior.
  - Always adhere to the single source of truth principle for repeated feature, formatting, etc.
  - Never use a short term solution, always target long term solutions and improvements.
  - Don't hesitate to refactor smaller or larger pieces to improve idiomaticity, simplicity, performance, clarity, maintainability, scalability and locality of behavior.
  - At the end of the implementation of a new feature, build and run integration tests.

Start by reading the [app's architecture documentation](docs/ARCHITECTURE.md)
