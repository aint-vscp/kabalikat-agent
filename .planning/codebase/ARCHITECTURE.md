# ARCHITECTURE

## High-Level Design
- Single React app (`App.tsx`) acts as UI, orchestration layer, scheduler, and interaction hub.
- Service modules under `services/` provide integration boundaries:
  - AI orchestration (`aiService.ts`)
  - Classroom retrieval (`classroomService.ts`)
  - Memory persistence (`memoryService.ts`)
  - Device bridge wrapper (`nativeBridgeService.ts`)
  - Email simulation (`emailService.ts`)
- Native Android side provides persistence and alarm survivability across app lifecycle events.

## Runtime Modes
- App mode enum includes dashboard, sentry, companion, calendar, settings, guide.
- Sentry behavior combines periodic checks, reminders, and hardware-trigger actions.

## Data and Control Flow
1. User input or background signals enter `App.tsx`.
2. AI processing delegated to `MultiProviderAIService` with tool-call outputs.
3. Tool calls trigger app actions (calendar updates, alarms, memory saves, notifications).
4. Calendar/reminder logic schedules local notifications and native exact alarm notifications for critical events.
5. Native receivers/services guarantee wake and delivery when app is backgrounded or after reboot.

## Native Resilience Path
- `MainActivity` starts/ensures service on create/resume.
- `KabalikatService` runs as foreground service with wake lock + restart scheduling.
- `BootReceiver` restarts service on boot/package replaced/restart broadcast.
- `AlarmTriggerReceiver` publishes high-priority full-screen alarm notification and ensures sentry service restart.

## State and Persistence
- UI state and app settings persisted to filesystem as TOON blobs.
- User memory stored separately through `MemoryService`.
- No backend database in current architecture.

## Boundaries
- Frontend and orchestration are tightly coupled in `App.tsx`.
- Native code is Android-only (no iOS implementation observed).
