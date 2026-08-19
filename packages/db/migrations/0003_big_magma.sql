DROP INDEX `task_images_cursor_idx`;--> statement-breakpoint
CREATE INDEX `task_images_picker_idx` ON `task_images` (`created_at`,`sort_index`);