# CONVENTIONS

## Language and Typing
- TypeScript-first approach with shared interfaces and enums in `types.ts`.
- `strict` is not enabled in current `tsconfig.json`; some implicit-any patterns exist in app code.
- Newer service wrappers use explicit interfaces and typed method contracts.

## Code Style Patterns
- React function components + hooks (`useState`, `useEffect`, `useCallback`, `useMemo`).
- Domain constants and model lists near top-level module scope.
- Guard clauses used for platform checks and permission checks.
- Async effects and service calls rely on try/catch with console logging.

## Architectural Conventions
- Service modules encapsulate external-system concerns.
- `App.tsx` acts as composition root and orchestrator.
- Native Android code placed under package `com.kabalikat.agent`.

## Naming and Data Shapes
- Event model uses snake_case time fields (`start_time`, `end_time`) and typed category/source unions.
- Urgency labels modeled as enum strings with explicit tiers.
- Plugin/channel IDs use lowercase snake/camel mix (`critical_alerts`, `kabalikat_alarm`).

## Persistence Conventions
- Uses TOON-encoded files for app data.
- Distinct files per concern (`kabalikat_theme.toon`, `kabalikat_calendar.toon`, etc.).
- Memory data separated from UI state.

## Error Handling Conventions
- Most failures are logged with `console.error` and soft fallback behavior.
- Partial resilience: notification/alarm fallbacks exist when native alarm call fails.
- User-facing error surfaces are limited compared with internal logging.

## Security and Secret Handling
- API keys and tokens are user-provided from settings and persisted locally.
- No dedicated encrypted secret store abstraction present in current code.
