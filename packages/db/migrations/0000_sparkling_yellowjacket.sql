CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
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
    length("tasks"."id") = 36
    AND substr("tasks"."id", 9, 1) = '-'
    AND substr("tasks"."id", 14, 1) = '-'
    AND substr("tasks"."id", 19, 1) = '-'
    AND substr("tasks"."id", 24, 1) = '-'
    AND lower("tasks"."id") NOT GLOB '*[^0-9a-f-]*'
),
	CONSTRAINT "tasks_workflow_id_uuid_check" CHECK(
    length("tasks"."workflow_id") = 36
    AND substr("tasks"."workflow_id", 9, 1) = '-'
    AND substr("tasks"."workflow_id", 14, 1) = '-'
    AND substr("tasks"."workflow_id", 19, 1) = '-'
    AND substr("tasks"."workflow_id", 24, 1) = '-'
    AND lower("tasks"."workflow_id") NOT GLOB '*[^0-9a-f-]*'
),
	CONSTRAINT "tasks_config_json_check" CHECK(json_valid("tasks"."config")),
	CONSTRAINT "tasks_status_check" CHECK("tasks"."status" in ('queued', 'running', 'done', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX `tasks_created_at_id_idx` ON `tasks` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_comfy_prompt_id_idx` ON `tasks` (`comfy_prompt_id`);--> statement-breakpoint
CREATE TABLE `task_images` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`path` text NOT NULL,
	`filename` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "task_images_task_id_uuid_check" CHECK(
    length("task_images"."task_id") = 36
    AND substr("task_images"."task_id", 9, 1) = '-'
    AND substr("task_images"."task_id", 14, 1) = '-'
    AND substr("task_images"."task_id", 19, 1) = '-'
    AND substr("task_images"."task_id", 24, 1) = '-'
    AND lower("task_images"."task_id") NOT GLOB '*[^0-9a-f-]*'
)
);
--> statement-breakpoint
CREATE INDEX `task_images_task_path_idx` ON `task_images` (`task_id`,`path`);--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`graph` text NOT NULL,
	`config_schema` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "workflows_id_uuid_check" CHECK(
    length("workflows"."id") = 36
    AND substr("workflows"."id", 9, 1) = '-'
    AND substr("workflows"."id", 14, 1) = '-'
    AND substr("workflows"."id", 19, 1) = '-'
    AND substr("workflows"."id", 24, 1) = '-'
    AND lower("workflows"."id") NOT GLOB '*[^0-9a-f-]*'
),
	CONSTRAINT "workflows_graph_json_check" CHECK(json_valid("workflows"."graph")),
	CONSTRAINT "workflows_config_schema_json_check" CHECK(json_valid("workflows"."config_schema"))
);
