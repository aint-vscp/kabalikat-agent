# STRUCTURE

## Repository Layout
- Root app entry:
  - `index.tsx` mounts React app
  - `App.tsx` contains core UI + orchestration logic
- Shared types:
  - `types.ts`
- Service layer:
  - `services/aiService.ts`
  - `services/classroomService.ts`
  - `services/emailService.ts`
  - `services/memoryService.ts`
  - `services/nativeBridgeService.ts`
- UI components:
  - `components/SetupGuide.tsx`
- Android native project:
  - `android/app/src/main/AndroidManifest.xml`
  - `android/app/src/main/java/com/kabalikat/agent/*.java`

## Key Responsibility Map
- `App.tsx`
  - App state, theme, calendar, logs, chat, alert lifecycle
  - Notification channel setup and scheduling
  - Alarm/flash/hardware trigger flows
  - OAuth callback handling
- `aiService.ts`
  - Prompting policy and function tool schema
  - Multi-provider model invocation and response normalization
- `classroomService.ts`
  - OAuth refresh and paginated Classroom API fetch
- `memoryService.ts`
  - Long-lived memory model and TOON file persistence
- `nativeBridgeService.ts`
  - TS-safe access to custom Capacitor native plugin

## Native Module Map
- `MainActivity.java`: plugin registration + service bootstrap + battery optimization request.
- `KabalikatService.java`: foreground process, heartbeat, wake lock, restart alarms.
- `BootReceiver.java`: reboot/package-replaced restart path.
- `KabalikatBridgePlugin.java`: native APIs callable from TS.
- `AlarmTriggerReceiver.java`: full-screen alarm notification trigger path.

## Config and Tooling Files
- `package.json`, `tsconfig.json`, `vite.config.ts`, `capacitor.config.ts`.
- Contribution/community docs exist (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`).
