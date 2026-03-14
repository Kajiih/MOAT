# `/lib` - Shared Infrastructure

The **Lib** domain encapsulates tools designed specifically for absolute horizontal sharing across the Moat ecosystem. If a component is deeply coupled to a specific app domain (e.g. `TierBoard`), it **does not** belong here.

## General Constraints
1. **Generic Helpers**: Things like UUID factories, semantic color maps (`theme.ts`), pure functional data mappers, and `pino` structured logging.
2. **Generic `ui/` Primitives**: Low-level React components that operate entirely blind to Moat's business constraints (e.g., agnostic `Button`, `Popover`, `Tooltip`, `ToastProvider`).

By isolating raw UI primitives away from rich business components like `SearchPanel`, testing and type verification is drastically simplified.
