# DndApp Architektur- und Migrationsanalyse

DnDApp is a single-module Kotlin Jetpack Compose app. Players and a dungeon master share a game through Firebase Auth and Cloud Firestore. There is no local database, no dependency injection, and no live D&D API. A React Native rewrite on Expo can keep the Firebase project and document shape, but the UI, icon system, and several lobby bugs have to be rebuilt deliberately so Android and iOS stay compatible with data the current app already writes.

## 1. Overview

The app (`applicationId` `com.example.dndapp`, display name DnDApp) is a session tool for a tabletop game. A signed-in user hosts a lobby and becomes the dungeon master, or joins with a six-character code and plays one character. During play the DM sees the party, runs NPCs from a bundled monster compendium, and chats one-to-one with players. Players keep a sheet, inventory, abilities, armour, notes, and a view of the DM’s monsters. The DM can edit a player’s character, and the player sees an in-app notice when that happens.

It is Kotlin only. There are 73 Kotlin files and about 19,600 lines under `app/src/main/java`. There are no `.java` sources. Several files omit a package and sit in the default package: `Monster.kt`, `MonsterViewModel.kt`, `MonsterCreationScreen.kt`, `MonsterEditScreen.kt`, `CountDownTimer.kt`, and `DamageImmunitiesDeserializer.kt`. `MainActivity` imports those types with bare names.

SDK and toolchain, from `app/build.gradle`, `gradle/libs.versions.toml`, and `gradle/wrapper/gradle-wrapper.properties`:

| Setting | Value |
|---|---|
| minSdk | 28 |
| compileSdk / targetSdk | 35 |
| Java / Kotlin JVM | 17 |
| Kotlin | 2.1.10 |
| Android Gradle Plugin | 8.5.2 |
| Gradle | 8.11.1 |
| versionName | 1.0 (`versionCode` 1) |

The only Gradle module is `:app` (`settings.gradle`, root name `DnDApp`). There is no library module, no data module, and no feature split.

UI is Jetpack Compose. `MainActivity` is the only activity and calls `setContent`. Navigation is one `NavHost` in `MainActivity` using `androidx.navigation:navigation-compose` 2.9.0. Material 3 and Material 2 are both on the classpath and both are used (`androidx.compose.material.Scaffold` next to Material 3 controls). The XML theme is only a shell: `Theme.DnDApp` in `app/src/main/res/values/themes.xml` parents `android:Theme.Material.Light.NoActionBar`. There are no layout XML screens.

Architecture is informal MVVM. Each feature has a `ViewModel` that owns a `FirebaseFirestore` instance and exposes `StateFlow` or `LiveData`, and the composables call Firebase Auth themselves. There is no repository, no use-case layer, and no DI. Hilt, Koin, and Dagger are not dependencies. `MyApplication` only calls `FirebaseApp.initializeApp`.

Dependencies that the code actually uses:

- Firebase BoM 33.14.0, Auth, Firestore, Analytics (`MyApplication`, `LoginViewModel`, the three feature view models).
- Compose UI, Material, Material 3, Navigation, Lifecycle ViewModel Compose.
- Coil (`coil-compose` 2.7.0) to draw bundled icons.
- Gson 2.11.0 to parse the JSON assets in `MonsterViewModel`.

Declared but unused: Room 2.7.1 (no `@Entity`, `@Dao`, or database class) and ConstraintLayout. `firebase-analytics` is on the classpath twice via the BoM; no custom analytics events are logged. `build.gradle` applies the Google Services plugin twice.

`gradle.properties` still lists older Firebase versions (`firebase_bom_version=32.1.1`, Auth 21.0.1, Firestore 24.0.1) that the version catalog does not use. Root `build.gradle` also sets `compose_version=1.4.6` while the catalog pulls Compose UI 1.8.2 and the Compose compiler plugin at Kotlin 2.1.10. `app/build.gradle` still sets `kotlinCompilerExtensionVersion "2.1.10"`, which is the old compiler-extension slot and does not match how Kotlin 2.1 expects Compose to be wired.

## 2. Login and authentication

Sign-in is Firebase Authentication with email and password only. There is no Google Sign-In, no phone auth, no anonymous auth, and no custom backend. `app/google-services.json` has an empty `oauth_client` array, which matches that. The Firebase project id is `dndniko-4de7a` (storage bucket `dndniko-4de7a.appspot.com`). The Android API key is committed in that file. This report does not repeat the key.

Relevant types:

- `LoginViewModel` (`app/src/main/java/com/example/dndapp/screens/login/LoginViewModel.kt`) calls `FirebaseAuth.signInWithEmailAndPassword` and `createUserWithEmailAndPassword`.
- `LoginScreen` is declared in package `com.example.dndapp`, not `screens.login` (`LoginScreen.kt`). It toggles between login and register, checks that email and password are non-empty, and navigates to `home`.
- `MainActivity` chooses the start route: `home` if `FirebaseAuth.currentUser != null`, otherwise `login`. `LoginScreen` repeats that check in a `LaunchedEffect`.
- `MyApplication` initializes Firebase.

Session handling is the Firebase Android SDK’s default persistence. There is no token code, no refresh logic, and no user-profile document. The only user id the rest of the app uses is `FirebaseAuth.currentUser.uid`. Nothing stores a display name.

These account features do not exist: logout, password reset, email verification, account deletion, and any profile screen. `LoginViewModel` logs the email address on every attempt (`Log.d("LoginViewModel", "Attempting to login with email: $email")`).

## 3. Lobbies

Lobbies are Firestore documents addressed by a random code, not a generated document id. `LobbyViewModel.generateLobbyCode` builds a 6-character string from `A–Z` and `0–9`. There is no lobby browser. Join is by typing the code on `HomeScreen`.

`LobbyViewModel` (`screens/lobby/LobbyViewModel.kt`) and `LobbyScreen` own the flow. `HomeScreen` is the entry point.

Create (`HomeScreen` then `LobbyViewModel.createLobby`):

1. Write `lobbies/{code}` with `host` = the current uid and `members` = a one-element array of that same uid.
2. Create a placeholder character named `"Host's Character"` with a new character id, owned by that uid (`CharacterViewModel.createHostCharacter`). That character id is not written into `members`.
3. Open `lobby/{code}`.

Join (`HomeScreen`):

1. `checkIfUserCanRejoinLobby` reads `countdown` and checks whether `members` contains the uid. If the adventure has started and the uid is in `members`, the host goes to `dungeon_master_screen/{code}`. A non-host is sent to `player_screen/{code}/{characterId}` with no `hostUserId` segment. The registered route requires three segments, so that rejoin navigation does not match.
2. Otherwise `joinLobby` only checks that the document exists. It does not add the user to `members`.
3. If that user already has any character, navigation goes to `character_choice/{code}`. If not, it goes to `character/{code}` (the creation form).

A player is added to the lobby only at the end of character creation. `CharacterInventoryScreen` saves the character, then `LobbyViewModel.addMemberToLobby` does `FieldValue.arrayUnion(characterId)`. So `members` mixes two kinds of ids: the host’s Firebase uid, and every player’s character document id.

Realtime:

- `subscribeToMembers` listens to `lobbies/{code}` and reloads characters with `whereIn("id", memberIds)`.
- `listenToMonsterUpdates` listens to `lobbies/{code}/monsters`.
- `startAdventure` sets `countdown: true` on the lobby document. Every client’s listener flips `startCountdown`. `CountdownTimer` (`CountDownTimer.kt`, default package) then counts down three seconds locally and routes the host to the DM screen and everyone else to `player_screen/{code}/{characterId}/{hostUserId}`.

Roles: there is no role field. DM means `lobby.host == currentUser.uid`. Everyone else is a player. One host, no co-DM, no spectator, no promotion. The host’s own character is filtered out of the member list in `LobbyScreen` (`members.filter { it.userId != host }`).

`LobbyState` is `Loading`, `Joined(lobbyCode, members, host)`, or `Error`.

Lobby UI (`LobbyScreen`): the code, a progress indicator, member cards with class icons, and `CharacterDetailsLobbyScreenDialog`. Only the host sees the control that calls `startAdventure`. Tapping your own character before the countdown opens `character_sheet/{code}/{characterId}`.

## 4. Characters

The model is `com.example.dndapp.dataClasses.Character`.

| Field | Role |
|---|---|
| `id` | Firestore document id |
| `userId` | Firebase Auth uid of the owner |
| `name`, `age`, `sex`, `height`, `weight`, `race` | Identity. Height and weight are integers |
| `level` (default 1), `experience` | Progression. No level table in code |
| `strength`, `intelligence`, `dexterity`, `charisma`, `stamina`, `wisdom` | Six scores. Stamina replaces Constitution |
| `secondaryAttributes` | Skill-like rows: icon name, name, description, value |
| `playerClass` | `name`, `itemRes` (drawable name), `description`, `subClass` |
| `abilities` | `name`, `description`, `level`, `category` |
| `inventory` | `Item`: name, details, count, category, subCategory, icon name, `haltbarkeitsValue`, `armorRating` |
| `gold` | Integer |
| `notes` | `PlayerNotes`: title, text, `creationDate` |
| `languages`, `pastHistory`, `additionalInfo` | Free text |
| `lastUpdatedBy` | Uid of the last writer |

Related types in `dataClasses`: `Ability`, `Item`, `PlayerClass`, `SecondaryAttribute`, `PlayerNotes`.

Storage is Firestore only, collection `characters`, document id = `character.id`. `CharacterViewModel` is the whole data layer: `loadCharacters` (`whereEqualTo("userId", uid)`), `loadCharacterById`, `loadCharactersByIds` (`whereIn("id", ids)`), `addCharacter`, `updateCharacter` (stamps `lastUpdatedBy`), `deleteCharacter`, `generateCharacterId`, and `listenToCharacterUpdates`. There is no Room cache and no offline-specific code. The Android Firestore SDK still enables its own disk cache by default.

How a character is tied to a user and a lobby:

- `userId` ties it to the account. A user can own more than one character. `loadCharacterByUserId` returns an arbitrary first match.
- Membership is the `members` array on the lobby, and that array stores character ids for players and the uid for the host. Characters are not a subcollection of the lobby.
- Deleting a character deletes the `characters` document and does not remove it from lobby arrays (`CharacterChoiceScreen` calls `deleteCharacter` only).
- `removeCharactersFromLobby` removes every character id owned by a uid from `members`. Creation calls it before re-adding the new id, so a user is meant to occupy one slot.

Creation wizard, all routes in `MainActivity`:

1. `character/{lobbyCode}` — `CharacterBasicInfoScreen`: name, age, sex, height, weight, experience, race, languages, past history, additional info.
2. `class_selection/{lobbyCode}/{characterId}` — `ClassSelectionScreen`.
3. `character_attributes/...` — `CharacterAttributesScreen`.
4. `character_abilities/...` — `CharacterAbilitiesScreen`.
5. `character_inventory/...` — `CharacterInventoryScreen`, including gold. On save it joins the lobby and returns to `lobby/{code}`.

Edit repeats that wizard under `edit_character_basic_info`, `edit_class_selection`, and `edit_character_attributes`. `CharacterEditScreen` is the DM editor (`character_edit_screen/{characterId}/{lobbyCode}`) and can change gold. `PlayerClassEditScreen` edits the class from the player sheet. `CharacterChoiceScreen` lists this user’s characters, hides any named `"Host's Character"`, and can delete or select one.

Class and skill lists are hardcoded in `IconUtils`, not loaded from the JSON assets. Classes include Warrior, Mage, Rogue, Rogue/Dieb, Cleric, Druid, Fighter, Barde, Warlock, Shaman, DeathKnight, Demon Hunter, Priest, and Hunter, plus custom name and icon. That is a house list (WoW-style Death Knight and Demon Hunter), not the Player’s Handbook class list. Secondary attributes are mostly the 5e skill list plus Initiative, Speed, and Throwing. One label is the typo `"Aanimal Handling"`. Ability categories are Attack, Defence, Heal, Magic, Support, Others. Item categories are Usables, Armour, Weapons, Others. Monster icon categories are Skeleton, Undead, Spirits/Demons, Humanoid, Beasts, Other.

Icons are stored as Android drawable entry names (`playerClass.itemRes`, `Item.icon`). UI resolves them with `resources.getIdentifier(name, "drawable", packageName)` in `IconUtils` consumers and `Functions.kt`. That string is the contract any new client has to honor.

D&D reference data is local. `MonsterViewModel` reads three assets on startup:

- `app/src/main/assets/monster.json` (1.1 MB) into `Monster`.
- `app/src/main/assets/spells.json` (388 KB) into `Spell`.
- `app/src/main/assets/monster_lore.json` (3.1 MB) into `MonsterLore`.

`monster_lore_sources.json` (4.6 KB, book names and acronyms such as `bgdia`, `cos`, `cm`) is not read by any Kotlin file. Nothing in the repo references a repo named `DND-App-Monster` or `dnd-data`, and there are no calls to dnd5eapi, Open5e, or any other HTTP API. The monster documents use slug `index` values (`"aboleth"`), uppercase type tags (`"ABERRATION"`), structured speed (`measurement_unit: FEET`), and source acronyms. That is a vendored 5e-style dataset, not a live service. `DamageImmunitiesDeserializer` exists and is never registered with Gson.

`Monster` (default package) is both the compendium row and the lobby NPC. Extra fields used for NPCs include `icon`, `imageUrl`, `lore`, and `race`. Nested types cover speed, ability scores, saves, skills, senses, special abilities, actions, legendary actions, damage dice, and spellcasting (`Spellcasting` in `dataClasses/SpellCasting.kt`). `getImageUrlByIndex` reads `_monsterImages`, which is never filled, so compendium image URLs are always null. Images for NPCs are whatever `imageUrl` or drawable name the DM picked in the editor.

## 5. Other screens and features

`MainActivity` registers these routes. Several player features exist twice: once as a tab inside `PlayerScreen`, and again as a standalone route.

| Route | Screen |
|---|---|
| `login` | `LoginScreen` |
| `home` | `HomeScreen`: host or join |
| `lobby/{lobbyCode}` | `LobbyScreen` |
| `dungeon_master_screen/{lobbyCode}?tab=` | `DungeonMasterScreen` |
| `character_choice/{lobbyCode}` | `CharacterChoiceScreen` |
| `character/{lobbyCode}` | `CharacterBasicInfoScreen` |
| `class_selection/{lobbyCode}/{characterId}` | `ClassSelectionScreen` |
| `character_attributes/...` | `CharacterAttributesScreen` |
| `character_abilities/...` | `CharacterAbilitiesScreen` |
| `character_inventory/...` | `CharacterInventoryScreen` |
| `character_sheet/...` | `CharacterSheet` |
| `edit_character_basic_info/...` | `EditCharacterBasicInfoScreen` |
| `edit_class_selection/...` | `EditClassSelectionScreen` |
| `edit_character_attributes/...` | `EditCharacterAttributesScreen` |
| `character_edit_screen/{characterId}/{lobbyCode}` | `CharacterEditScreen` (DM) |
| `player_screen/{lobbyCode}/{characterId}/{hostUserId}` | `PlayerScreen` |
| `player_class_edit_screen/...` | `PlayerClassEditScreen` |
| `player_armour_screen/...` | `PlayerArmourScreen` |
| `abilities_screen/...` | `PlayerAbilityScreen` |
| `inventory_screen/...` | `PlayerInventoryScreen` |
| `notes_screen/...` and `player_notes_screen/...` | `PlayerNotesScreen` |
| `npc_screen/{lobbyCode}` | `PlayerMonsterScreen` |
| `dm_chat_screen/{receiverId}/{lobbyCode}/{characterName}/{selectedTab}` | `DungeonMasterChatScreen` |
| `player_chat/{lobbyCode}/{userId}/{hostUserId}` | `PlayerChatScreen` |
| `npc_creation_screen/...` | `MonsterCreationScreen` |
| `npc_edit_screen/...` | `MonsterEditScreen` |
| `add_monster_to_npcs/...` | `AddMonsterToNPCsCompediumScreen` |
| `monster_detail/{monsterIndex}` | `MonsterDetailScreen` |

DM drawer (`DungeonMasterScreen`, sections in the composable): Lobby, Monsters, Chat, Notes, Monster Compendium. The lobby tab lists party characters and opens the DM editor. The monsters tab creates, edits, and deletes NPCs (`addNpcToLobby`, `updateMonsterInLobby`, `deleteMonsterFromLobby`) and can copy a compendium stat block into the lobby. Notes are the DM user’s character notes (`DMNotesScreen` is called with the DM uid). Chat lists players and opens a private thread. Unread state shows `PulsatingEmailIcon` on the menu. The compendium tab searches `MonsterViewModel` and opens `monster_detail`.

Player drawer (`NavigationDrawerContent`): Character Sheet, Inventory, Abilities, Armour, Monsters, Notes, plus Change Character, which routes to `character_choice`. The sheet shows attributes, gold, class, and a chat button to `player_chat`. `PlayerArmourScreen` is the worn-armour slice of inventory (`armorRating`, `haltbarkeitsValue`). `PlayerMonsterScreen` is a read-only view of lobby NPCs. A snackbar uses `R.string.updated_bydm_notification` when `lastUpdatedBy` is someone else. That is in-app UI, not a system notification.

Chat (`ChatViewModel`, `dataClasses/ChatMessage.kt`) is private between the host uid and one player uid. Messages live at `lobbies/{code}/chats/{autoId}` with `senderId`, `receiverId`, `message`, `timestamp` (millis as a string), and `read`. Opening the thread marks messages read. `LobbyViewModel.getMessages` and `CharacterViewModel.sendMessage` write a smaller payload (no `receiverId`, no `read`) and have no callers.

Dialogs that are not routes: `CharacterDetailDialog`, `CharacterDetailsLobbyScreenDialog`, `AttributeIconDialog`, `ClassIconDialog`, `InventoryIconDialog`, `NpcIconScreen`, `MonsterDetailDialog`, `MonsterIconDialog`, `MonsterImageDialog`, `SpellSelectionDialog`, `PlayerNpcDetailDialog`, `PlayerInventoryItemAddingEditingDialog`, `EditCharacterAttributesDialog`, `CategorySelectionDialog`. `MonsterCreationScreen` and `MonsterEditScreen` are about 1,500 and 1,260 lines and edit the full `Monster` graph, including spell picks from `spells.json`.

`SketchScreen` draws with `android.graphics.Bitmap` and `Canvas` and tries to return the bitmap through the navigation back stack. It is not registered in the `NavHost`, so it is unreachable.

Strings are in `values/strings.xml` and `values-de/strings.xml` (login, lobby, and a few labels). Most UI text is hardcoded English, with German leftovers in identifiers (`haltbarkeitsValue`, class name `Barde`, `Rogue/Dieb`).

There is no dice roller, no battle map, no initiative tracker, no audio, no camera, and no account settings screen.

## 6. Backend and data layer

Firestore is the only remote store. There is no Realtime Database, no Cloud Functions, no Firebase Storage usage in code, and no REST client. The storage bucket in `google-services.json` is unused by the app.

Collections inferred from the writers:

```
lobbies/{lobbyCode}
  host: string            // Firebase uid
  members: string[]       // host uid, plus player character ids
  countdown: boolean      // set true when the DM starts

lobbies/{lobbyCode}/monsters/{monsterDocId}
  Monster { ... }         // NPC copy, id field set to the doc id

lobbies/{lobbyCode}/chats/{autoId}
  senderId, receiverId, message, timestamp, read

characters/{characterId}
  Character { ... }       // id, userId, sheet, inventory, notes
```

Security rules are not in this repository. There is no `firestore.rules`, `firebase.json`, or `firestore.indexes.json`. Whatever is deployed in the Firebase console is the real access policy. The client assumes a signed-in user can create lobby ids, update any lobby they know the code of, read and write any character document, and read every chat in a lobby.

Queries that need composite indexes, which are also not in the repo:

- `chats` where `senderId` in [a, b] and `receiverId` in [a, b] order by `timestamp` (`ChatViewModel.getMessagesBetweenUsers`). Two `whereIn` clauses plus `orderBy` will fail until an index exists.
- `chats` where `senderId` ==, `receiverId` ==, `read` == false (`listenForUnreadMessages`).
- `chats` where `receiverId` ==, `senderId` ==, order by `timestamp` (`getMessagesFromHost`).
- `characters` where `userId` == (`loadCharacters`). A single-field index is automatic.
- `characters` where `id` in (...) (`loadCharactersByIds`). `whereIn` is capped (10 values historically, 30 in current server SDKs). A large party can fail the query. An empty `members` list also makes `whereIn` fail.

Networking is the Firestore and Auth gRPC/HTTPS stack. The manifest requests only `INTERNET`. `backup_rules.xml` and `data_extraction_rules.xml` are empty samples. `android:allowBackup="true"` is set. There is no local database to back up; Auth session state is what backup would touch.

`MonsterViewModel` holds the whole compendium, spell list, and lore list in memory for the process lifetime.

## 7. Code health

Tests. `app/src/test/.../ExampleUnitTest.kt` asserts `2 + 2`. `app/src/androidTest/.../ExampleInstrumentedTest.kt` asserts the package name. No Firebase, ViewModel, or Compose tests. No CI config.

Build. This environment has no `ANDROID_HOME` and no Android SDK, so the project was not compiled. Static review is the basis for the notes below. The Gradle files are in a state that often fails a clean build: duplicate Google Services plugin, duplicate Firebase artifacts, a stale `kotlinCompilerExtensionVersion`, and version numbers split across `gradle.properties`, the root `ext` block, and the catalog.

Bugs and sharp edges that will matter for a large feature:

- `members` means uid for the host and character id for players. `loadCharactersByIds` looks up character documents by `id`, so the host uid does not resolve to `"Host's Character"`. `checkIfUserCanRejoinLobby` looks for the uid, so a player who was added by character id cannot rejoin after start. `HomeScreen` then navigates to a `player_screen` route that is missing `hostUserId`.
- `joinLobby` does not join. Membership is a side effect of finishing inventory.
- `subscribeToMembers` and `listenToMonsterUpdates` register snapshot listeners and never remove them. `loadLobby` calls `subscribeToMembers` again, so listeners stack.
- `listenToCharacterUpdates` reads a field named `updatedBy`. Writers set `lastUpdatedBy`. The player snackbar happens to use the deserialized `lastUpdatedBy`, so the notice can still appear. The `updatedBy` read is dead.
- `CharacterViewModel.loadLobby` / `replaceMemberInLobby` duplicate `LobbyViewModel` and disagree about whether the host character stays in the list. Some routes call `viewModel()` and get a second `CharacterViewModel` that does not share the activity-scoped one (`character_edit_screen`, `player_class_edit_screen`, `edit_character_basic_info`).
- Lobby codes are not checked for collision.
- Chat timestamps are strings, so `orderBy("timestamp")` is lexical. Millisecond strings of the same length sort correctly until the digit length changes.
- `getImageUrlByIndex` always returns null. `DamageImmunitiesDeserializer` and `monster_lore_sources.json` are unused. `SketchScreen` is unreachable.
- `PlayerScreen` is about 1,400 lines, `DungeonMasterScreen` about 1,100, `Functions.kt` about 900 lines of drawable-name switches. UI, navigation, and Firestore writes sit in the same composables.

Security:

- No rules in source. If the console rules are open, anyone who can hit the project can read every character sheet and every chat, or overwrite any lobby whose code they guess. Codes are 36^6, but they are the document ids and there is no lockout.
- The Android API key is in git at `app/google-services.json`. Restrict it by package name and SHA in Google Cloud, and add an iOS restriction before shipping an iPhone build.
- Auth emails are written to logcat.
- There is no sign-out, so a shared device keeps the session.
- Chat listeners are not limited to the two participants in client code. Enforcement has to be in rules.
- `allowBackup="true"` with an empty rules file can include Auth persistence in Android backup.

What makes a large feature expensive: one activity-sized `NavHost`, ViewModels that are the API, no test seam around Firestore, mixed member ids, icon strings that only resolve on Android, and multi-thousand-line screens that would have to be touched for almost any new flow.

## 8. React Native migration assessment

The rewrite target is Expo managed workflow: Expo Router, EAS Build, and config plugins or dev builds only where a native module is required. Nothing in this codebase forces a bare React Native app or `expo prebuild` checked into git. There is no NDK, no JNI, no custom `View`, no foreground service, and no existing React Native project. The native surface that matters is Firebase, the vector-drawable icon set, and one unused Android canvas.

### What maps to Expo SDK modules

| Current feature | Expo mapping |
|---|---|
| Single activity, `NavHost`, string routes | Expo Router file routes. Drawers are Expo Router drawer layouts (`expo-router` plus the drawer dependency it documents). Tabs inside DM and player screens should be one route with a segment, not the duplicate stack routes this app has |
| Material theme, buttons, text fields, dialogs, snackbar | A JS UI kit (React Native Paper, or a small custom theme). Compose does not carry over |
| Coil | `expo-image` |
| In-app “DM updated your sheet” snackbar and the pulsating unread icon | Component state fed by a Firestore listener. Not a notification API |
| `values` / `values-de` strings | `expo-localization` plus a message catalog. Most strings are hardcoded, so this is a rewrite, not an export |
| JSON assets | `expo-asset` or a Metro asset, read with `expo-file-system` so the 4.5 MB of JSON is not parsed inside the route module on startup |
| App icon `monster_eye_monster` | `app.json` / `app.config` icon and adaptive icon |
| Internet-only networking | Default Expo networking. No extra permission config for parity |
| Email/password session | See Firebase choice below. Persistence is either the JS SDK with `AsyncStorage` (`@react-native-async-storage/async-storage`, bundled with Expo) or native Auth in a dev build |

`SketchScreen` is the only `android.graphics` use. It is not in the nav graph. Parity does not require it. If it is revived, `expo-skia` (`@shopify/react-native-skia`, included with current Expo SDKs) replaces `Bitmap` and `Canvas`. Do not port `savedStateHandle` bitmaps.

### Firebase: Expo Go path versus dev build

Two clients can talk to project `dndniko-4de7a`. They are not equal.

Firebase JS SDK (`firebase` package, `firebase/auth` and `firebase/firestore`) runs in Expo Go. Email/password and `onSnapshot` cover this app’s real use. Add a Web app in the Firebase console and ship that config. You do not need `google-services.json` or `GoogleService-Info.plist` for the JS SDK. Offline disk persistence is the gap: the Android SDK caches Firestore on disk by default, and the JS SDK on React Native does not offer that same cache. A flaky table session will feel worse.

`@react-native-firebase/app`, `auth`, and `firestore` match the current Android persistence and listener behavior more closely. They do not run in Expo Go. They fit the managed workflow through the React Native Firebase config plugin, `expo-dev-client`, and EAS Build. That is a dev build, not an eject. Analytics is the same split: the dependency is present today, but no events are logged, so analytics can wait. If you add it, use `@react-native-firebase/analytics` in that same dev client. The old `expo-firebase-analytics` module is not the thing to adopt.

Recommendation for this app: use the JS SDK while building screens in Expo Go, and switch Auth plus Firestore to `@react-native-firebase` in the EAS dev client before a real table test if offline cache matters. Do not mix both Firestore implementations in one binary.

Either choice needs the same server work, which is not in this repo: deploy Firestore rules, create the chat composite indexes, and decide what `members` contains. Do that before two clients write the same documents. Fix the member id so it is always a character id (or always a uid plus a separate `characterId`) and migrate existing lobby documents once. Leave the field names (`lastUpdatedBy`, `itemRes`, `haltbarkeitsValue`, string `timestamp`) stable so the Kotlin app can keep reading them during the overlap.

### Feature-by-feature

Auth. Email and password only. No Google provider is configured, so there is no iOS URL scheme, no `GIDClientID`, and no Google Sign-In config plugin. Sign in with Apple is not required for an email/password app. It becomes required if you later add Google or another social provider. Add `sendPasswordResetEmail` and an explicit sign-out even though the Kotlin app has neither. Register an iOS app in the same Firebase project when you take the native SDK path, and use a real bundle id. `com.example.dndapp` is a placeholder Apple will not accept for a store build.

Lobbies and realtime. `onSnapshot` on `lobbies/{code}`, the `monsters` subcollection, and the open character document replace `subscribeToMembers`, `listenToMonsterUpdates`, and `listenToCharacterUpdates`. Remove listeners on screen blur (Expo Router focus events). The Kotlin code never does this. Lobby codes, the `countdown` flag, and the three-second local timer are plain JS. Role stays `host === auth.uid`.

Characters. TypeScript types can mirror `Character` and its nested classes. Reads and writes stay on `characters/{id}`. The hard part is icons: Firestore stores Android resource entry names such as `class_rouge`. Build one map from those names to shared SVG or PNG assets and use it on both platforms. Do not generate new icon keys. `getIdentifier` has no iOS equivalent.

Data layer. No Room, so there is nothing to replace with `expo-sqlite` unless you choose to cache the compendium. Prefer loading the JSON assets once into memory or into SQLite after first launch. The 3.1 MB lore file will hitch a JS thread if it is `import`ed as a module. There is no local SQL schema to port.

UI screens. Rebuild from the route table in section 5. Collapse the duplicate player routes (`inventory_screen`, `abilities_screen`, `notes_screen`, `player_notes_screen`, `npc_screen`) into the player drawer. Keep DM and player as two route groups. Dialogs become RN modals. `MonsterCreationScreen` and `MonsterEditScreen` are the largest UI ports. They are forms over the `Monster` object, not native views.

Native-only APIs. Vector XML drawables (434 files under `app/src/main/res/drawable`) do not render on iOS and are not an Expo asset type. Convert them to SVG and render with `react-native-svg`, which works in Expo Go. Watch for Android vector features that do not translate (clip paths, some gradients). Coil, `R.drawable` ints, `Context.getIdentifier`, and `android.graphics` do not come along. `java.time` becomes `Date`. No camera, location, Bluetooth, biometrics, WorkManager, or widgets exist to replace.

Push notifications. Not part of parity. The current “notification” is a Snackbar while a listener is attached, and unread chat is an icon. Both die when the process is killed. System push would be new scope: `expo-notifications` (supported in managed Expo, needs a dev or store build for real tokens), FCM on Android, APNs on iOS, an Apple push key, the Push Notifications capability, and a Cloud Function trigger because a phone cannot run a Firestore listener in the background. Skip this until the in-app listener behavior matches.

### iOS concerns

- Create the iOS app in Firebase before the first EAS iOS build if you use React Native Firebase. `GoogleService-Info.plist` is applied by the config plugin. The JS SDK does not need that file. It does need the Web app config embedded in the Expo app.
- Email/password needs no reversed-client-id URL scheme. Adding Google Sign-In later means a URL scheme, a dev build, and Sign in with Apple beside it.
- No notification permission, background mode, or location usage string is required for parity. Do not add them preemptively. Apple reviews usage strings.
- App Transport Security is satisfied by Firebase HTTPS. There is no cleartext traffic.
- The phone UI uses a 300dp drawer and long forms. It will run on iPad inside Expo, but it is a phone layout. Safe areas come from `react-native-safe-area-context`, which Expo Router already uses.
- Privacy nutrition labels should cover email, user ids, and user-generated character and chat text stored in Firestore.
- Export compliance is standard HTTPS only.
- `minSdk 28` is inside Expo’s Android range. The iOS deployment target will be whatever the chosen Expo SDK sets (current SDKs are in the iOS 15 range). You do not need to match API 28 with an iOS version.
- German strings are thin. `expo-localization` can follow the device locale, but the English hardcoding has to be extracted first or iOS and Android will not match.

### Conflicts with Expo

Nothing here requires leaving the managed workflow. The constraints are:

- `@react-native-firebase/*` needs a custom dev client and EAS. It is a config plugin, and it conflicts with Expo Go, not with managed Expo.
- Android vector XML and `R.drawable` names cannot be imported as-is. That is an asset pipeline, not a native module.
- Do not put the Firestore rules problem off. An iOS client on the public App Store makes an open ruleset worse. Ship rules that restrict `characters` to the owner, except for a narrow DM update path, and restrict `lobbies/{code}/chats` to the host and the other participant.
- Do not bundle a second Firebase project. Both clients should use `dndniko-4de7a` so existing accounts and characters still open.
- `com.example.dndapp` cannot be the iOS bundle id you submit.

### Suggested order

1. Expo app, Router groups `(auth)`, `(home)`, `lobby/[code]`, `dm/[code]`, `player/[code]`, EAS profiles for Android and iOS, and the SVG icon map keyed by the existing drawable names.
2. Firestore rules and chat indexes in the existing project. One-time cleanup of `members` so every entry is a character id. Confirm a Kotlin client still reads the migrated documents.
3. Email/password auth on the JS SDK in Expo Go, plus sign-out. Add the dev client and `@react-native-firebase/auth` only when you leave Expo Go.
4. Character read and write against `characters`, including the creation wizard and the player sheet. This proves the icon map and the document shape on both platforms.
5. Lobby create, join, rejoin, member listener, and the countdown handoff to DM versus player. Fix the missing `hostUserId` case here rather than copying it.
6. DM drawer: party list, NPC CRUD, compendium loaded from the JSON assets, DM notes.
7. Player drawer: inventory, abilities, armour, notes, monster view, and the DM-edit snackbar.
8. Private chat and unread state, after the composite indexes exist.
9. EAS production builds for both stores. Add `expo-notifications` only if background push is actually required.

### Parity inventory

A rewrite is at parity when these behaviors exist on Android and iOS:

- Register and sign in with email and password. Stay signed in across restarts. Sign-out is new and should be included.
- Host a lobby, show the code, create the host character, and list joining players in realtime.
- Join by code, create a character or pick an existing one, and land in the lobby as a non-host.
- Rejoin a started lobby as DM or as the right player character, including when the app was killed.
- DM starts the adventure. Both sides leave the lobby after a short countdown. DM opens the DM home. Player opens the player home.
- Character wizard: identity, class (preset or custom, with icon), six scores, secondary attributes, abilities, inventory, gold. Edit the same fields later. Delete a character the user owns.
- Player session: sheet, inventory, abilities, armour with rating and durability, notes, read-only NPCs, change character, private chat with the DM, snackbar when the DM writes the sheet.
- DM session: party list, edit a player character, NPC create/edit/delete, copy from the compendium, compendium detail with lore and spells, DM notes, per-player chat with unread indication.
- Compendium and spell list come from the bundled JSON, not from a network API.
- Icons saved by the Kotlin app still resolve.

Out of scope for parity, because they are not reachable or not implemented: `SketchScreen`, system push, Google Sign-In, dice, maps, initiative, logout as it exists today (it does not), and the unused `monster_lore_sources.json` file.

The Kotlin app is a functional spec, not a template to port. The backend products it uses are still current. What aged is the Android client: deprecated artifacts, frozen UI libraries, and a few data habits that a new Expo app should not copy.

## 9. Deprecated and end-of-life surface

The repo was bumped onto a 2024–2025 toolchain (Kotlin 2.1.10, AGP 8.5.2, Gradle 8.11.1, Firebase BoM 33.14.0, `compileSdk` 35) while the code kept older patterns. Several things people expect in an old Firebase app are simply not here.

Not in this project, so they are not migration work:

| Often-dead technology | In this repo? |
|---|---|
| Firebase Dynamic Links (shut down 25 August 2025) | No |
| Legacy Google Sign-In (`GoogleSignInClient`, `play-services-auth`, `GoogleApiClient`) | No. `oauth_client` in `app/google-services.json` is empty |
| `kotlin-android-extensions` / Kotlin synthetics | No. Plugins are `kotlin-android` and `org.jetbrains.kotlin.android` only |
| `AsyncTask`, `startActivityForResult`, `findViewById`, Support Library, `jcenter` | No |
| FirebaseUI, Realtime Database, Firebase Storage, Cloud Functions, App Check, Crashlytics, Remote Config | No |
| Accompanist, Retrofit, OkHttp | No |

What is actually in use:

**Firebase Android KTX artifacts.** `app/build.gradle` depends on `firebase-auth-ktx`, `firebase-firestore-ktx`, and `firebase-analytics-ktx`, and the BoM is applied twice. Google deprecated the separate `-ktx` libraries and folded the Kotlin APIs into the main modules. Replacement on Android would be `firebase-auth`, `firebase-firestore`, and `firebase-analytics` from one BoM. The call sites do not even use the KTX helpers. `LoginViewModel`, `LobbyViewModel`, `CharacterViewModel`, and `ChatViewModel` call `FirebaseAuth.getInstance()`, `FirebaseFirestore.getInstance()`, and `Task.addOnCompleteListener`. For Expo, do not wrap that callback style. Use the modular JS SDK (`firebase/auth`, `firebase/firestore`) with `async`/`await`, or `@react-native-firebase` in an EAS dev build. Do not use the namespaced `firebase/compat` layer, and do not use the retired `expo-firebase-analytics` package. Auth email/password itself is not deprecated. `signInWithEmailAndPassword` and `createUserWithEmailAndPassword` are still the right product behavior.

**Material 2, kept next to Material 3.** `androidx.compose.material` is on the classpath (`material` 1.8.2) and is feature-frozen. `MainActivity` wraps the app in Material 2 `MaterialTheme` and `Surface`. `DungeonMasterScreen`, `PlayerScreen`, `PlayerNotesScreen`, and `PlayerMonsterScreen` use Material 2 `Scaffold`. `PlayerNotesScreen` uses Material 2 `TopAppBar`. `EditCharacterAttributesDialog` is entirely Material 2. `DungeonMasterScreen` calls `rememberScaffoldState` and then ignores it in favor of a Material 3 drawer. `SketchScreen` imports `androidx.compose.material.*`. Replacement for a Kotlin app would be Material 3 only. For Expo, use one JS library (React Native Paper, or a small custom theme). Do not reproduce two design systems.

**Material 3 `Divider`.** `InventoryIconDialog`, `NpcIconScreen`, `DmDrawerContent`, `NavigationDrawerContent`, and the monster dialogs import `androidx.compose.material3.Divider`. That composable was deprecated in Material 3 1.2 in favor of `HorizontalDivider` and `VerticalDivider`. This project is on Material 3 1.3.2. Expo has no equivalent to port. Use a plain separator in the new UI kit.

**`ExperimentalMaterial3Api` and `ExperimentalComposeUiApi`.** Top app bars, login, character attributes, and both monster editors opt into these. They mark APIs that were unstable when the screens were written. Many have since stabilized. Treat them as a sign the screens were written against an older Compose contract, not as APIs to reimplement. Expo Router layouts and normal `TextInput` focus replace them.

**Coil `rememberImagePainter`.** Coil 2.7.0 is declared. `rememberImagePainter` has been deprecated since Coil 2.0. It is still called from `MonsterCreationScreen`, `MonsterEditScreen`, `MonsterCompendiumScreen`, and `AddMonsterToNPCsCompediumScreen`. Other screens already use `rememberAsyncImagePainter`. Coil 3 also moved packages to `coil3`. Neither Coil 2 nor Coil 3 belongs in the Expo app. Use `expo-image`.

**Compose compiler setting that Kotlin 2 no longer uses.** `app/build.gradle` applies `org.jetbrains.kotlin.plugin.compose` and also sets `composeOptions.kotlinCompilerExtensionVersion "2.1.10"`. The extension version was the old Compose compiler coordinate. Since Kotlin 2.0 the compiler plugin replaces it. Root `build.gradle` still pins `compose_version = 1.4.6` and `firebase_bom_version = 32.1.1`, and `gradle.properties` repeats those plus Auth 21.0.1 and Firestore 24.0.1. The catalog actually resolves Compose UI 1.8.2 and BoM 33.14.0. Those leftover pins are the “old project” still sitting in the build files. The Expo app should not copy any of these version numbers. Use the current Expo SDK.

**Old Gradle layout, not an abandoned Gradle.** Gradle 8.11.1 and AGP 8.5.2 still build, but the shape is legacy: a `buildscript` block, `allprojects { repositories }`, `apply plugin: 'com.google.gms.google-services'` at the bottom of `app/build.gradle` while the same plugin is also in `plugins {}`, `packagingOptions` (AGP 8 renamed this to `packaging`), and `rootProject.buildDir` in the clean task (deprecated in Gradle 8; the replacement is `layout.buildDirectory`). `kotlin-android` and `org.jetbrains.kotlin.android` are both applied. None of this is end of life. It is the pre-catalog, pre-plugin-DSL style. EAS Build and Expo prebuild replace it. Do not reproduce a Gradle build for the new client.

**`targetSdk` 35.** That met Google Play’s 2025 target requirement. It is not a deprecated API. Before any new Play upload, check the console’s current target API. The Expo app should take the target and the iOS deployment target from the Expo SDK you adopt, not from `app/build.gradle`.

**Patterns that are not deprecated APIs, and still should not be copied.**

| Kotlin behavior | Modern equivalent in the Expo app |
|---|---|
| `viewModelScope.launch { task.addOnCompleteListener ... }` in `LoginViewModel` and the Firestore view models. The coroutine does not wait for the task | `async`/`await` on the modular SDK. One function returns a result or throws |
| Activity-scoped `viewModel()` plus extra `viewModel()` calls on `character_edit_screen`, `player_class_edit_screen`, and `edit_character_basic_info` | Route-scoped state. One store per lobby or character, created by the route, destroyed on blur |
| String routes in the 650-line `NavHost` in `MainActivity`, several of them duplicates of drawer tabs | Expo Router file routes. Player inventory, abilities, armour, notes, and monsters are tabs of `player/[code]`, not separate stacks |
| `LiveData` in `MonsterViewModel` next to `StateFlow` everywhere else | One reactive model. In React, query state or a small store. No LiveData bridge |
| Gson plus Guava `TypeToken` (`com.google.common.reflect.TypeToken` in `MonsterViewModel`) over assets | `JSON.parse` of an `expo-asset` / `expo-file-system` file, or a typed import. `DamageImmunitiesDeserializer` has no callers. Drop it |
| Snapshot listeners that are never removed (`subscribeToMembers`, `listenToMonsterUpdates`, `listenForUnreadMessages`) | Subscribe in an effect and return the unsubscribe. Firestore’s API is the same. The leak is the bug to avoid |
| `resources.getIdentifier` and drawable entry names | A single map from the existing string keys (`class_rouge`, and the `item_*` / `monster_*` names) to SVG or PNG. `react-native-svg` or `expo-image` |
| In-app snackbar and `PulsatingEmailIcon` as “notifications” | The same in-app UI driven by a listener. `expo-notifications` only if you later add real push, which this app does not have |
| Room on the classpath and unused | No local database until a feature needs one. Then `expo-sqlite`, not a port of an empty Room dependency |
| `CharacterViewModel.sendMessage` and `LobbyViewModel.getMessages`, which no screen calls | One chat writer: `senderId`, `receiverId`, `message`, `timestamp`, `read` |

`androidx.core:core-ktx`, `lifecycle-runtime-ktx`, and `room-ktx` are normal AndroidX artifacts. They are not the deprecated Firebase KTX line. Room is unused. Navigation Compose 2.9 string routes are the older Navigation style (type-safe routes arrived in 2.8). Leave them behind with the rest of `MainActivity`.

## 10. Backend: what can stay

The services behind the app still exist and are the right ones for the Expo client. Email/password Firebase Auth is a current provider. Cloud Firestore is a current database. There is no shut-down product in the path. There are also no Cloud Functions, no security rules, and no index files in the repo, so “keep the backend as-is” only applies to the parts that are actually deployed and visible from the client.

Keep, as the shared contract with any data the Kotlin app already wrote:

- Project `dndniko-4de7a`. Add an iOS app and, if you use the JS SDK, a Web app config. Do not create a second project.
- Email/password as the only sign-in method. Existing user ids stay valid, and `Character.userId` keeps meaning the Firebase uid.
- The collection layout:
  - `characters/{characterId}`
  - `lobbies/{lobbyCode}` with `host`, `members`, and `countdown`
  - `lobbies/{lobbyCode}/monsters/{id}`
  - `lobbies/{lobbyCode}/chats/{id}` with `senderId`, `receiverId`, `message`, `timestamp`, and `read`
- Field names, including the awkward ones: `lastUpdatedBy`, `haltbarkeitsValue`, `itemRes`, `armorRating`, string `timestamp` of epoch millis, and icon values that are Android drawable names. Renaming them while the Kotlin app can still open the same project will strand old documents.
- The bundled compendium. `monster.json`, `spells.json`, and `monster_lore.json` are app assets, not Firestore. Ship them with the Expo app. `monster_lore_sources.json` is unused. Leave it out until a screen needs it.

Change on the server before the Expo app shares production data:

**Security rules have to be written, not carried over.** None are in the repo, and the client never checks them. Until rules are inspected in the Firebase console, assume they are not a spec you can keep. The Expo app should ship rules in source. A workable policy that still matches the product:

- Only a signed-in user reads or writes.
- A character document may be read by its owner and by the host of a lobby whose `members` contain that character id. The owner and that host may update it. Deletes stay with the owner.
- A lobby may be created by the signed-in user, who must set `host` to their own uid. Updates to `members` and `countdown` are allowed for the host, and a join is allowed only as the narrow write the join flow needs.
- `monsters` are readable by any lobby member and writable by the host.
- A chat document is readable and writable only by `host` and the other uid on that message.

That last rule cannot be enforced correctly until `members` has one meaning. Today the host is stored as a uid and players are stored as character ids (`LobbyViewModel.createLobby` versus `addMemberToLobby`). Fix that with a one-time script, then point both clients at the cleaned documents. Prefer `members` as character ids plus `host` as a uid, which is already how non-host entries work. This is a data repair, not a new schema.

**Chat queries need composite indexes.** They are not in the repo. `ChatViewModel.getMessagesBetweenUsers` uses two `whereIn` filters and `orderBy("timestamp")`. Unread checks filter `senderId`, `receiverId`, and `read`. Create those indexes before the chat screens ship, or the listeners will fail on both platforms. While the Kotlin app is still writing, keep `timestamp` as a millisecond string so existing order stays stable. Move to a numeric timestamp or a Firestore `Timestamp` only after the Kotlin client is retired.

**Cloud Functions are not required for parity.** There is nothing deployed to keep or rewrite. Add a function later only for something the client must not do itself: system push when the app is killed, or a trusted “DM edits this character” path if the rules above prove too loose. Do not add Functions just because the Kotlin view models talk to Firestore directly.

**Auth settings to turn on, without changing the provider.** Password reset and sign-out are missing in Kotlin. They are client features on the same provider. In the console, confirm email/password is enabled, and turn on email-enumeration protection and a password policy if they are still off. Do not add Google Sign-In in the first Expo release. The legacy Android Google Sign-In API is deprecated in favor of Credential Manager, and on iOS a Google button also forces Sign in with Apple. Neither exists in the current product.

**App Check is optional hardening, not a port.** The Kotlin app does not use it. Adding Play Integrity and App Attest means a dev build and a console enrollment. Do it before a public store launch if the rules are the only thing standing between the project and open clients. It is not needed to prove the Expo app against existing data.

**What “works” means.** Auth and Firestore for this project will keep working if the console project is still on the Blaze or Spark plan you already use and email/password stays enabled. The document shape will keep working if the Expo client reads and writes the fields above. The behavior will not match the Kotlin app until the `members` repair, the rules, and the chat indexes exist. Those three are server updates. The ViewModel callbacks, Material 2 screens, KTX artifacts, Coil painters, and string `NavHost` are client history. Rebuild the behavior from the screen inventory in the earlier report, against this data contract, with the current Expo and Firebase clients.
