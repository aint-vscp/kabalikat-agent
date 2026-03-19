# CONCERNS

## High Severity

### 1) Monolithic orchestration in App.tsx
- Evidence: `App.tsx` owns UI rendering, provider auth flow, calendar engine, alarm scheduling, plugin setup, conflict checks, and hardware actuation.
- Risk: High change risk and regression probability; low testability.
- Impact: Feature additions can unintentionally break critical alert behavior.
- Mitigation: Extract domain modules (scheduler, alert engine, provider adapters, persistence coordinators).

### 2) Secret and token storage strategy
- Evidence: API keys, OAuth client secret, and refresh token are persisted as local app data files.
- Risk: Device compromise could expose long-lived credentials.
- Impact: Unauthorized API usage and account access risks.
- Mitigation: Move secrets to platform-secure storage abstraction and minimize persisted secret scope.

### 3) Android build environment fragility
- Evidence: Native build requires Java 11+ but can fail under Java 8 runtime.
- Risk: CI/local build inconsistencies and contributor friction.
- Impact: Slower delivery and broken release pipelines.
- Mitigation: Pin and document JDK version (11/17) in setup and CI.

## Medium Severity

### 4) Incomplete automated testing
- Evidence: No test framework scripts/files present.
- Risk: Regressions in timing-sensitive alarm logic are hard to detect early.
- Impact: Reliability issues in production-critical reminders.
- Mitigation: Add unit/service/integration tests with deterministic time control.

### 5) Email integration is simulation-only
- Evidence: `services/emailService.ts` returns randomized simulated findings.
- Risk: Product behavior can diverge from real-world expectations.
- Impact: False confidence during demos and planning.
- Mitigation: Replace with explicit provider integration or clearly gate as mock mode.

### 6) WakeLock handling pattern
- Evidence: Partial wake lock acquired with timeout and heartbeat re-acquire attempts.
- Risk: Battery impact or gaps if lifecycle timing changes.
- Impact: Potential background reliability/battery tradeoff issues.
- Mitigation: Review wake lock lifecycle against modern Android background constraints and telemetry.

## Low Severity

### 7) Configuration and style drift potential
- Evidence: Lint/format tooling exists but no enforced test/lint scripts in commit pipeline.
- Risk: Gradual inconsistency in style and safety patterns.
- Impact: Reduced maintainability over time.
- Mitigation: Add standard scripts and optional pre-commit/CI checks.
