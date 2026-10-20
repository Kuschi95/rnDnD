/**
 * Maps Android drawable entry names stored in Firestore to shared assets.
 *
 * `playerClass.itemRes`, `Item.icon`, and monster `icon` are those names.
 * The Kotlin client resolves them with `resources.getIdentifier`. iOS cannot.
 * Keep the keys. Do not generate new ones.
 *
 * TODO — convert the vector drawables:
 * 1. The DndApp repo (https://github.com/Kuschi95/DndApp) was not readable
 *    here (HTTP 404), so the 434 XML vectors under
 *    `app/src/main/res/drawable` were not copied.
 * 2. Convert each vector to SVG and render it with `react-native-svg`, or to
 *    PNG and render it with `expo-image`. Clip paths and some gradients do
 *    not survive the conversion; check those files by hand.
 * 3. Point the matching key in `iconMap` at `require()` of the new file.
 * 4. Leave unknown names unresolved (`null`) until the file exists. The app
 *    icon `monster_eye_monster` is the same job, for `app.config.ts`.
 *
 * `class_rouge` is the one entry name the migration analysis quotes.
 * Warrior, Mage, Rogue, and the rest are class labels, not drawable names.
 */

export type IconAsset = number | null;

export const iconMap = {
  class_rouge: null,
} as const satisfies Record<string, IconAsset>;

export type KnownIconName = keyof typeof iconMap;

export function resolveIcon(drawableName: string | null | undefined): IconAsset | null {
  if (!drawableName) {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(iconMap, drawableName)) {
    return iconMap[drawableName as KnownIconName];
  }
  return null;
}
