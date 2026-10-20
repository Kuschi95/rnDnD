# rnDnD

Expo rewrite of the Kotlin D&D session app. Players and a dungeon master share a lobby through the existing Firebase project `dndniko-4de7a`. This repository is the foundation: routing, auth, local SQLite, and the Firestore contract. Feature screens are placeholders.

The old app is the functional spec. The architecture notes are in [docs/DndApp-Analyse.md](docs/DndApp-Analyse.md). Day-to-day conventions for people and coding agents are in [AGENTS.md](AGENTS.md).

## Requirements

- Node.js 22 (the version CI uses)
- npm
- Expo Go for SDK 58 once it is in the stores, or an EAS development build until then

SDK 58 is the current stable Expo SDK. The Expo Go build for SDK 58 was not in the App Store or Play Store on the day this project was created (see the [SDK 58 changelog](https://expo.dev/changelog/sdk-58)). `npx expo start` still works. Until that Expo Go ships, use a [development build](#eas-builds) on a device, or the SDK 58 Expo Go preview Expo documents at the time you install it.

## Setup

```bash
npm install
cp .env.example .env
```

Fill `.env` from the Firebase console. Project settings → Your apps → add a **Web** app if there is not one yet, then copy that config. The Android `google-services.json` from the Kotlin repo is not the config this app reads. The JS SDK does not need `google-services.json` or `GoogleService-Info.plist`.

| Variable                                   | Where it comes from                     |
| ------------------------------------------ | --------------------------------------- |
| `EXPO_PUBLIC_FIREBASE_API_KEY`             | Web app config                          |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Usually `dndniko-4de7a.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID`          | `dndniko-4de7a`                         |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Usually `dndniko-4de7a.appspot.com`     |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Web app config                          |
| `EXPO_PUBLIC_FIREBASE_APP_ID`              | Web app config                          |

`.env` is gitignored. Do not commit real keys.

Confirm email/password sign-in is enabled on the existing project. Do not create a second Firebase project.

## Run

```bash
npx expo start
```

Open the project in Expo Go (SDK 58), an iOS simulator, or an Android emulator. The first screen is sign-in. Without `.env` the form explains that Firebase is not configured. With `.env`, email and password sign-in, registration, password reset, and sign-out go through Firebase Auth. The session is stored in AsyncStorage on Android and iOS, and in local storage on web.

```bash
npm run web
npm run ios
npm run android
```

`ios` needs macOS. `android` needs an emulator or a device.

## Drizzle

SQLite lives on the device (`rndnd.db`). The schema is `src/db/schema.ts`. Migrations are generated SQL in `drizzle/` and run at startup with `applyMigrations` in `src/db/migrate.ts`. That uses `execAsync` instead of Drizzle's `useMigrations`, because the prepared-statement migrator does not finalize DDL on the web worker and then cannot see `__drizzle_migrations`.

After changing the schema:

```bash
npm run db:generate
```

Commit the new SQL file and the updated `drizzle/meta` journal. The app applies pending migrations the next time it launches. Do not edit a migration that has already shipped; add another one.

In a dev build or Expo Go, open Drizzle Studio from the Expo dev tools menu (`shift+m` in the `expo start` terminal) and choose `expo-drizzle-studio-plugin`. Studio does not run on web.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npx expo-doctor
```

## EAS builds

Install the CLI when you are ready (`npx eas-cli@latest`), then:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` writes the EAS project id. Profiles in `eas.json`:

| Profile       | What it is                                             |
| ------------- | ------------------------------------------------------ |
| `development` | Dev client, internal distribution, iOS simulator build |
| `preview`     | Internal distribution, store-like binary for testers   |
| `production`  | Store build, remote version auto-increment             |

```bash
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development --platform ios
```

Set the same `EXPO_PUBLIC_FIREBASE_*` variables for EAS (`eas env:create` or the Expo dashboard) before a cloud build. A development build is also the point to switch Auth and Firestore to `@react-native-firebase`. Do not install that package while this app still runs in Expo Go, and do not ship both Firestore clients in one binary.

## Firestore rules and indexes

`firestore.rules` and `firestore.indexes.json` are in the repo. Nothing in this project deploys them. Read the warning at the top of `firestore.rules` before deploying by hand: the Kotlin app and these rules disagree about `members` until that array is repaired.

## App identity

Name `rnDnD`, scheme `rndnd`, iOS bundle id and Android package `com.kuschi95.rndnd`. Change them in `app.config.ts`. The launcher icons are still the Expo template icons. Replace them when `monster_eye_monster` has been converted. See the TODO in `src/icons/icon-map.ts`.
