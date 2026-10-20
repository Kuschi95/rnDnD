CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`age` integer,
	`sex` text,
	`height` integer,
	`weight` integer,
	`race` text,
	`level` integer DEFAULT 1 NOT NULL,
	`experience` integer DEFAULT 0 NOT NULL,
	`strength` integer DEFAULT 0 NOT NULL,
	`intelligence` integer DEFAULT 0 NOT NULL,
	`dexterity` integer DEFAULT 0 NOT NULL,
	`charisma` integer DEFAULT 0 NOT NULL,
	`stamina` integer DEFAULT 0 NOT NULL,
	`wisdom` integer DEFAULT 0 NOT NULL,
	`secondaryAttributes` text NOT NULL,
	`playerClass` text,
	`abilities` text NOT NULL,
	`inventory` text NOT NULL,
	`gold` integer DEFAULT 0 NOT NULL,
	`notes` text NOT NULL,
	`languages` text,
	`pastHistory` text,
	`additionalInfo` text,
	`lastUpdatedBy` text
);
--> statement-breakpoint
CREATE INDEX `characters_user_id` ON `characters` (`userId`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`lobbyCode` text NOT NULL,
	`id` text NOT NULL,
	`senderId` text NOT NULL,
	`receiverId` text NOT NULL,
	`message` text NOT NULL,
	`timestamp` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`lobbyCode`, `id`)
);
--> statement-breakpoint
CREATE INDEX `chat_messages_thread` ON `chat_messages` (`lobbyCode`,`senderId`,`receiverId`);--> statement-breakpoint
CREATE TABLE `lobbies` (
	`code` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`members` text NOT NULL,
	`countdown` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lobby_monsters` (
	`lobbyCode` text NOT NULL,
	`id` text NOT NULL,
	`body` text NOT NULL,
	PRIMARY KEY(`lobbyCode`, `id`)
);
--> statement-breakpoint
CREATE TABLE `sync_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`op` text NOT NULL,
	`collection_path` text NOT NULL,
	`doc_id` text NOT NULL,
	`payload` text,
	`enqueued_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `sync_outbox_target` ON `sync_outbox` (`collection_path`,`doc_id`);