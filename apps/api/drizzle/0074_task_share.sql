-- PRSM fork: anonymous task sharing. Installs that ran the fork's earlier
-- 0064_harsh_lord_hawal and 0065_task_share_created_at_utc already have this
-- table, so every statement is safe to run on them too.
CREATE TABLE IF NOT EXISTS "task_share" (
	"task_id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	CONSTRAINT "task_share_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "task_share" ADD CONSTRAINT "task_share_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "task_share" ALTER COLUMN "created_at" SET DEFAULT (now() AT TIME ZONE 'utc');
--> statement-breakpoint
-- Catch-up for those same installs: drizzle only runs migrations newer than the
-- last one recorded, and the fork's 0065 (2026-10-26 03:00) is newer than
-- upstream's 0064_custom_field_hidden_options (2026-10-17), so it was skipped.
ALTER TABLE "custom_field_definition" ADD COLUMN IF NOT EXISTS "hidden_options" jsonb DEFAULT '[]'::jsonb NOT NULL;
