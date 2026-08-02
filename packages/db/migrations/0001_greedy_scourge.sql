PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_task_images` (
	`task_id` text NOT NULL,
	`path` text NOT NULL,
	`filename` text NOT NULL,
	PRIMARY KEY(`task_id`, `path`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "task_images_task_id_uuid_check" CHECK(
    length("__new_task_images"."task_id") = 36
    AND substr("__new_task_images"."task_id", 9, 1) = '-'
    AND substr("__new_task_images"."task_id", 14, 1) = '-'
    AND substr("__new_task_images"."task_id", 19, 1) = '-'
    AND substr("__new_task_images"."task_id", 24, 1) = '-'
    AND lower("__new_task_images"."task_id") NOT GLOB '*[^0-9a-f-]*'
)
);
--> statement-breakpoint
INSERT INTO `__new_task_images`("task_id", "path", "filename") SELECT "task_id", "path", "filename" FROM `task_images`;--> statement-breakpoint
DROP TABLE `task_images`;--> statement-breakpoint
ALTER TABLE `__new_task_images` RENAME TO `task_images`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `task_images_task_path_idx` ON `task_images` (`task_id`,`path`);--> statement-breakpoint
CREATE TABLE `__new_tasks` (
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
INSERT INTO `__new_tasks`("id", "name", "status", "workflow_id", "config", "created_at", "updated_at", "error_code", "error_message") SELECT "id", "name", "status", "workflow_id", "config", "created_at", "updated_at", "error_code", "error_message" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
CREATE INDEX `tasks_created_at_id_idx` ON `tasks` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE TABLE `__new_workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`graph` text NOT NULL,
	`config_schema` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "workflows_id_uuid_check" CHECK(
    length("__new_workflows"."id") = 36
    AND substr("__new_workflows"."id", 9, 1) = '-'
    AND substr("__new_workflows"."id", 14, 1) = '-'
    AND substr("__new_workflows"."id", 19, 1) = '-'
    AND substr("__new_workflows"."id", 24, 1) = '-'
    AND lower("__new_workflows"."id") NOT GLOB '*[^0-9a-f-]*'
),
	CONSTRAINT "workflows_graph_json_check" CHECK(json_valid("__new_workflows"."graph")),
	CONSTRAINT "workflows_config_schema_json_check" CHECK(json_valid("__new_workflows"."config_schema"))
);
--> statement-breakpoint
INSERT INTO `__new_workflows`("id", "name", "graph", "config_schema", "created_at", "updated_at") SELECT "id", "name", "graph", "config_schema", "created_at", "updated_at" FROM `workflows`;--> statement-breakpoint
DROP TABLE `workflows`;--> statement-breakpoint
ALTER TABLE `__new_workflows` RENAME TO `workflows`;