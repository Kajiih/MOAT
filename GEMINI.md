# Project Guidelines: MOAT - Tier List App

- Information about the app is available in README.md
- You should lint your code, use `npm run lint`, we have a strict code quality requirements.
  - Lints should not be ignored with comments unless it is the best solution for idiomaticity, simplicity, performance, clarity, maintainability, scalability and locality of behavior
- You can and should write tests when if they are relevant. We use vitest.
  - Don't write tests if it is not relevant or trivial.
  - NEVER test implementation details.
  - Few well chosen tests is better than testing anything and everything.
  - Use `npm run test -- --run --no-color` to run tests.
- We also use integration tests with playwright.
  - You can implement integration test if they are relevant.
  - Use `PLAYWRIGHT_HTML_OPEN='never' npx playwright test` to run tests.
- Follow test-driven development principles.
  - In particular, when solving a bug, first find how to reproduce it with a test, then fix it.
  - When implementing a new feature, first write a test that describes the desired behavior, then implement the feature.
  - We have powerful mocking and testing infrastructure, use it, and improve it when needed.
- Always make sure that what you understand perfectly what you are supposed to do before starting working on it. There is no stupid question, and we need to always look for the best solution.

- Write documentation to important or not trivial units of code, including modules, functions, variables, etc.
- Always follow best practices of modern web development, and focus on idiomaticity, simplicity, performance, clarity, maintainability, scalability and locality of behavior.
  - Always adhere to the single source of truth principle for repeated feature, formatting, etc.
  - Never use a short term solution, always target long term solutions and improvements.
  - Don't hesitate to refactor smaller or larger pieces to improve idiomaticity, simplicity, performance, clarity, maintainability, scalability and locality of behavior.
  - At the end of the implementation of a new feature, build and run integration tests.
  - We are in early development mode with no real users, so we can make breaking changes, ambitious refactoring, using cutting edge solutions, etc.
  - Our UI and API should be simple, predictable and reliable, always focus on those aspects.


- Always use the terminology defined in the [Glossary](docs/GLOSSARY.md).
