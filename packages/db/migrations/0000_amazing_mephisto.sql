CREATE TABLE `task_images` (
	`task_id` text NOT NULL,
	`path` text NOT NULL,
	`filename` text NOT NULL,
	PRIMARY KEY(`task_id`, `path`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_images_task_path_idx` ON `task_images` (`task_id`,`path`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`workflow_id` text NOT NULL,
	`config` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`error_code` text,
	`error_message` text,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "tasks_config_json_check" CHECK(json_valid("tasks"."config")),
	CONSTRAINT "tasks_status_check" CHECK("tasks"."status" in ('queued', 'running', 'done', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX `tasks_created_at_id_idx` ON `tasks` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`graph` text NOT NULL,
	`config_schema` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "workflows_graph_json_check" CHECK(json_valid("workflows"."graph")),
	CONSTRAINT "workflows_config_schema_json_check" CHECK(json_valid("workflows"."config_schema"))
);
