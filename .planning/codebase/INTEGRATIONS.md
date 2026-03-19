# INTEGRATIONS

## AI Provider Integrations
- Google Gemini via `@google/genai` in `services/aiService.ts`.
- OpenAI and OpenRouter via REST `chat/completions` in `services/aiService.ts`.
- Azure OpenAI via deployment endpoint in `services/aiService.ts`.
- Function/tool calling contract normalized so app consumes one response shape.

## Google OAuth and Classroom
- OAuth token refresh endpoint: `https://oauth2.googleapis.com/token`.
- Classroom API endpoint base: `https://classroom.googleapis.com/v1`.
- Classroom sync implementation in `services/classroomService.ts`.
- Required user secrets: client id, client secret, refresh token.

## Email Integration
- `services/emailService.ts` currently simulates inbox findings.
- No IMAP/SMTP backend wiring in this repository; logic is placeholder/demo behavior.

## Android OS Integrations
- Foreground service: `KabalikatService`.
- Boot/package-replaced restart receiver: `BootReceiver`.
- Full-screen alarm receiver: `AlarmTriggerReceiver`.
- Capacitor bridge plugin for native calls: `KabalikatBridgePlugin` + TS wrapper in `services/nativeBridgeService.ts`.

## Notification and Alarm Channels
- Local notification channels created in app runtime:
  - `critical_alerts`
  - `reminders`
- Native channel in service/receiver path:
  - `kabalikat_alarm`

## Data Persistence Integrations
- Filesystem-based storage for app state (`Directory.Data`) and memory (`Directory.Documents`).
- TOON encode/decode used for persistence format.

## Web/Android Bridge
- App shell: React on webview.
- Native behavior exposed through Capacitor plugins and custom bridge registration in `MainActivity`.
