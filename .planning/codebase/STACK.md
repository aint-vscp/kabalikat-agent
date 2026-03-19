# STACK

## Application Runtime
- Frontend runtime: React 19 with TypeScript.
- Bundler/dev server: Vite 6.
- Module mode: ESM (`"type": "module"`).
- Target platform: Android via Capacitor 8 bridge.

## Language and Build
- Primary language: TypeScript (`target: ES2022`, `moduleResolution: bundler`).
- JSX transform: `react-jsx`.
- Build scripts:
  - `npm run dev` -> Vite dev server
  - `npm run build` -> Vite production build
  - `npm run preview` -> Vite preview server

## Mobile/Native Layer
- Capacitor core and Android platform package.
- Native Android code in Java under `android/app/src/main/java/com/kabalikat/agent/`.
- Foreground service and broadcast receivers used for persistent background behavior.

## UI and UX Libraries
- UI framework: React function components.
- Icon library: `lucide-react`.
- Styling approach: utility classes (Tailwind-style class usage in JSX).

## AI and Data
- LLM SDK: `@google/genai`.
- Multi-provider AI calls through direct HTTP for OpenAI/OpenRouter/Azure in service layer.
- Local data format: `@toon-format/toon` for encoded persisted state.

## Device Capability Plugins
- Notifications: `@capacitor/local-notifications`.
- Alarm scheduling: `@capgo/capacitor-alarm`.
- Flashlight/strobe: `@capgo/capacitor-flash`.
- Keep awake: `@capacitor-community/keep-awake`.
- Filesystem persistence: `@capacitor/filesystem`.
- App lifecycle: `@capacitor/app`.

## Tooling and Quality
- Linting deps present: ESLint + TypeScript ESLint plugins.
- Formatting dep present: Prettier.
- No dedicated test runner configured in `package.json`.
