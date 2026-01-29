ALTER TABLE "order_workflow_stage" ALTER COLUMN "stage_type_key" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "workflow_template_stage" ALTER COLUMN "stage_type_key" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "stage_catalog" ALTER COLUMN "key" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."order_stages_name_enum";--> statement-breakpoint
CREATE TYPE "public"."order_stages_name_enum" AS ENUM('review', 'contract_signature', 'payment', 'production', 'quality_control', 'packaging', 'shipping', 'delivery');--> statement-breakpoint
ALTER TABLE "order_workflow_stage" ALTER COLUMN "stage_type_key" SET DATA TYPE "public"."order_stages_name_enum" USING "stage_type_key"::"public"."order_stages_name_enum";--> statement-breakpoint
ALTER TABLE "workflow_template_stage" ALTER COLUMN "stage_type_key" SET DATA TYPE "public"."order_stages_name_enum" USING "stage_type_key"::"public"."order_stages_name_enum";--> statement-breakpoint
ALTER TABLE "stage_catalog" ALTER COLUMN "key" SET DATA TYPE "public"."order_stages_name_enum" USING "key"::"public"."order_stages_name_enum";--> statement-breakpoint
ALTER TABLE "stage_catalog" ADD COLUMN "displayName" varchar(255) NOT NULL;