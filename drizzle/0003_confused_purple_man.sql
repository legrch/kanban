CREATE TABLE `project_counters` (
	`prefix` text PRIMARY KEY NOT NULL,
	`last_number` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_task_numbers` (
	`card_id` text PRIMARY KEY NOT NULL,
	`prefix` text NOT NULL,
	`number` integer NOT NULL
);
