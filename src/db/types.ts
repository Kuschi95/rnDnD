/**
 * Shapes stored in Firestore by the Kotlin app.
 * Field names are the contract. Do not rename them.
 */

export type SecondaryAttribute = {
  icon: string;
  name: string;
  description: string;
  value: number;
};

export type PlayerClass = {
  name: string;
  /** Android drawable entry name. Resolved through the icon map, never renamed. */
  itemRes: string;
  description: string;
  subClass: string;
};

export type Ability = {
  name: string;
  description: string;
  level: number;
  category: string;
};

export type Item = {
  name: string;
  details: string;
  count: number;
  category: string;
  subCategory: string;
  /** Android drawable entry name. */
  icon: string;
  /** Durability. The German field name is intentional. */
  haltbarkeitsValue: number;
  armorRating: number;
};

export type PlayerNote = {
  title: string;
  text: string;
  creationDate: string;
};

/**
 * The Kotlin field is described as `PlayerNotes`. The notes screen holds more
 * than one note, so this app stores a JSON array. Confirm a live document
 * before the first write: if Kotlin persisted a single object, keep reading
 * both and write back the shape that document already uses.
 */
export type PlayerNotes = PlayerNote[];

/**
 * Lobby NPC document. The compendium row and the lobby copy share this graph.
 * Unknown nested fields stay on the object so a round trip does not drop them.
 */
export type LobbyMonsterDocument = {
  id: string;
  index?: string;
  name?: string;
  type?: string;
  icon?: string | null;
  imageUrl?: string | null;
  lore?: string | null;
  race?: string | null;
} & Record<string, unknown>;

export type FirestoreCharacter = {
  id: string;
  userId: string;
  name: string;
  age: number | null;
  sex: string | null;
  height: number | null;
  weight: number | null;
  race: string | null;
  level: number;
  experience: number;
  strength: number;
  intelligence: number;
  dexterity: number;
  charisma: number;
  stamina: number;
  wisdom: number;
  secondaryAttributes: SecondaryAttribute[];
  playerClass: PlayerClass | null;
  abilities: Ability[];
  inventory: Item[];
  gold: number;
  notes: PlayerNotes;
  languages: string | null;
  pastHistory: string | null;
  additionalInfo: string | null;
  lastUpdatedBy: string | null;
};

export type FirestoreLobby = {
  host: string;
  members: string[];
  countdown: boolean;
};

export type FirestoreChatMessage = {
  senderId: string;
  receiverId: string;
  message: string;
  /** Epoch milliseconds as a string. Do not switch this to a number or Timestamp. */
  timestamp: string;
  read: boolean;
};
