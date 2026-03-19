# TESTING

## Current State
- No automated unit/integration/e2e tests detected in repository.
- No `test` script in `package.json`.
- No `*.spec.*` or `*test*` source files found in workspace query.

## Existing Verification Approach
- Manual verification through:
  - `npm run build` for web compile/bundle check.
  - Android Gradle assemble from `android/` for native compile check.
  - Runtime checks on physical Android device for alarm/notification/flash behavior.

## Critical Paths That Need Tests
- Reminder scheduling correctness (2h/1h/30m/5m/NOW windows).
- Tool-call handling from AI response normalization across providers.
- Recurring task generation and de-duplication.
- Native bridge fallback logic when plugin calls fail.
- Classroom pagination and token refresh error paths.

## Recommended Test Strategy
1. Add unit tests (Vitest + React Testing Library) for pure logic helpers extracted from `App.tsx`.
2. Add service-level tests with mocked `fetch` for `aiService.ts` and `classroomService.ts`.
3. Add lightweight integration tests for event creation -> reminder scheduling pipeline.
4. Add Android instrumentation/manual regression checklist for foreground service and full-screen alarms.

## Regression Checklist (Manual)
- Fresh install permission flow.
- Reboot device and verify sentry service recovery.
- Trigger critical event while app closed; verify heads-up/full-screen alarm behavior.
- Verify calendar/task persistence across app restarts.
- Verify provider switching (Google/OpenAI/OpenRouter/Azure) does not break tool-call handling.
