CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`session` text NOT NULL,
	`values_json` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`session`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`activity` text NOT NULL,
	`participant` text NOT NULL,
	`presentation` text NOT NULL,
	`status` text DEFAULT 'closed' NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`selected` text DEFAULT '[0,1,2,3]' NOT NULL,
	`snapshot` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_participant_unique` ON `sessions` (`participant`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_presentation_unique` ON `sessions` (`presentation`);