CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`hash` text NOT NULL,
	`path` text NOT NULL,
	`mime` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "images_id_uuid_check" CHECK(
    length("images"."id") = 36
    AND substr("images"."id", 9, 1) = '-'
    AND substr("images"."id", 14, 1) = '-'
    AND substr("images"."id", 19, 1) = '-'
    AND substr("images"."id", 24, 1) = '-'
    AND lower("images"."id") NOT GLOB '*[^0-9a-f-]*'
),
	CONSTRAINT "images_hash_check" CHECK(length("images"."hash") = 64 AND lower("images"."hash") NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "images_mime_check" CHECK("images"."mime" in ('image/png', 'image/jpeg')),
	CONSTRAINT "images_dimension_check" CHECK("images"."width" > 0 AND "images"."height" > 0),
	CONSTRAINT "images_size_check" CHECK("images"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `images_hash_idx` ON `images` (`hash`);--> statement-breakpoint
CREATE INDEX `images_created_at_idx` ON `images` (`created_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_task_images` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`image_id` text NOT NULL,
	`type` text NOT NULL,
	`sort_index` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`image_id`) REFERENCES `images`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "task_images_task_id_uuid_check" CHECK(
    length("__new_task_images"."task_id") = 36
    AND substr("__new_task_images"."task_id", 9, 1) = '-'
    AND substr("__new_task_images"."task_id", 14, 1) = '-'
    AND substr("__new_task_images"."task_id", 19, 1) = '-'
    AND substr("__new_task_images"."task_id", 24, 1) = '-'
    AND lower("__new_task_images"."task_id") NOT GLOB '*[^0-9a-f-]*'
),
	CONSTRAINT "task_images_image_id_uuid_check" CHECK(
    length("__new_task_images"."image_id") = 36
    AND substr("__new_task_images"."image_id", 9, 1) = '-'
    AND substr("__new_task_images"."image_id", 14, 1) = '-'
    AND substr("__new_task_images"."image_id", 19, 1) = '-'
    AND substr("__new_task_images"."image_id", 24, 1) = '-'
    AND lower("__new_task_images"."image_id") NOT GLOB '*[^0-9a-f-]*'
),
	CONSTRAINT "task_images_type_check" CHECK("__new_task_images"."type" in ('input', 'output', 'mask', 'control')),
	CONSTRAINT "task_images_sort_index_check" CHECK("__new_task_images"."sort_index" >= 0)
);
--> statement-breakpoint
-- 不搬舊資料：舊 task_images 是 (id, task_id, path, filename)，沒有任何欄位能對應
-- 到 images.id。既有的圖片關聯在此捨棄，storage/tasks 也要一併清掉後重新 seed。
DROP TABLE `task_images`;--> statement-breakpoint
ALTER TABLE `__new_task_images` RENAME TO `task_images`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `task_images_slot_idx` ON `task_images` (`task_id`,`type`,`sort_index`);--> statement-breakpoint
CREATE INDEX `task_images_image_id_idx` ON `task_images` (`image_id`);--> statement-breakpoint
CREATE INDEX `task_images_cursor_idx` ON `task_images` (`created_at`,`id`);