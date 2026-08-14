PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`status` text NOT NULL,
	`workflow_id` text NOT NULL,
	`config` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`comfy_prompt_id` text,
	`error_code` text,
	`error_message` text,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "tasks_id_uuid_check" CHECK(
    length("__new_tasks"."id") = 36
    AND substr("__new_tasks"."id", 9, 1) = '-'
    AND substr("__new_tasks"."id", 14, 1) = '-'
    AND substr("__new_tasks"."id", 19, 1) = '-'
    AND substr("__new_tasks"."id", 24, 1) = '-'
    AND lower("__new_tasks"."id") NOT GLOB '*[^0-9a-f-]*'
),
	CONSTRAINT "tasks_workflow_id_uuid_check" CHECK(
    length("__new_tasks"."workflow_id") = 36
    AND substr("__new_tasks"."workflow_id", 9, 1) = '-'
    AND substr("__new_tasks"."workflow_id", 14, 1) = '-'
    AND substr("__new_tasks"."workflow_id", 19, 1) = '-'
    AND substr("__new_tasks"."workflow_id", 24, 1) = '-'
    AND lower("__new_tasks"."workflow_id") NOT GLOB '*[^0-9a-f-]*'
),
	CONSTRAINT "tasks_config_json_check" CHECK(json_valid("__new_tasks"."config")),
	CONSTRAINT "tasks_status_check" CHECK("__new_tasks"."status" in ('queued', 'running', 'done', 'failed', 'cancelled'))
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "name", "status", "workflow_id", "config", "created_at", "updated_at", "comfy_prompt_id", "error_code", "error_message") SELECT "id", "name", "status", "workflow_id", "config", "created_at", "updated_at", "comfy_prompt_id", "error_code", "error_message" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `tasks_created_at_id_idx` ON `tasks` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_comfy_prompt_id_idx` ON `tasks` (`comfy_prompt_id`);