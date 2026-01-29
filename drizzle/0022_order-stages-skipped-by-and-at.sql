ALTER TABLE "order_workflow_stage" ADD COLUMN "skipped" uuid;--> statement-breakpoint
ALTER TABLE "order_workflow_stage" ADD COLUMN "skipped_at" timestamp with time zone;