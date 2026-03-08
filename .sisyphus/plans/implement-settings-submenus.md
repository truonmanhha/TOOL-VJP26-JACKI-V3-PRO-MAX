# Implement Settings Submenus & Real Functionality

## Context
User has provided HTML templates for the submenus of the iOS Settings UI:
1. **Thông tin cá nhân (Profile Details)**
2. **Khóa API (API Key)**

The user wants:
1. To embed these submenus perfectly, matching the `code.html` structures.
2. To add REAL FUNCTIONALITY to all these toggles and inputs.

## State Management Required
In `ChatBot.tsx`, we need states for the submenus:
- `settingsView`: `'main' | 'profile' | 'api-key'`

And real functionality states:
- `userName` (string)
- `userEmail` (string)
- `userHandle` (string)
- `faceIdEnabled` (boolean)
- `apiKey` (string) - currently uses `process.env.API_KEY || 'dummy'` inside `ChatBot.tsx`. We should allow overriding it via localStorage.
- `smartResponse` (boolean)
- `contextAwareness` (boolean)
- `bypassMode` (boolean) -> This can toggle the aggressive `evadeSafetyFilters` logic.
- `pushNotifications` (boolean)
- `voiceOutput` (boolean)

## Plan
1. Parse the provided HTML. It contains both "Profile" and "API Key" views.
2. In `ChatBot.tsx`, replace the static `showSettings` boolean with a `currentView` string (`'chat' | 'settings-main' | 'settings-profile' | 'settings-apikey'`).
3. Build out the 3 sub-views (Main Settings, Profile Settings, API Key Settings) using the user's verbatim HTML, translating `@apply` and static text.
4. Implement localStorage bindings for all the settings so they are "real" and persist.
   - Example: `localStorage.getItem('vjp26_chatbot_name')`
5. Hook up the `Bypass Mode` toggle to the `intelLevel` or `isAggressiveLocked` or the `evadeSafetyFilters` check. (Currently the chatbot is purely Unbound. We can make the toggle visual for now, or actually bypass the evade step if false).
