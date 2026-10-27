CREATE TABLE `task_numbers` (
	`number` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_numbers_card_id_unique` ON `task_numbers` (`card_id`);