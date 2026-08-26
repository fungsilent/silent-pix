ALTER TABLE `tasks` ADD `workflow_revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workflows` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `workflows` ADD `archived_at` integer;--> statement-breakpoint
UPDATE `workflows` SET `config_schema` = json_remove(`config_schema`, '$.scheduler') WHERE json_extract(`config_schema`, '$.scheduler') IS NOT NULL;
