CREATE TYPE "public"."bom_revision_status_enum" AS ENUM('draft', 'released');--> statement-breakpoint
CREATE TYPE "public"."work_order_status_enum" AS ENUM('draft', 'released', 'closed', 'canceled');--> statement-breakpoint
CREATE TABLE "bom_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bom_revision_id" uuid NOT NULL,
	"material_name" varchar(255) NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"_deleted" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bom_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"code" varchar(255) NOT NULL,
	"revision_string" varchar(50) NOT NULL,
	"status" "bom_revision_status_enum" DEFAULT 'draft' NOT NULL,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"_deleted" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "factories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"_deleted" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"factory_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(255) NOT NULL,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"_deleted" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"factory_id" uuid NOT NULL,
	"bom_revision_id" uuid NOT NULL,
	"target_quantity" numeric(12, 4) NOT NULL,
	"status" "work_order_status_enum" DEFAULT 'draft' NOT NULL,
	"planned_start" timestamp with time zone,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"_deleted" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "guests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_product" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint

ALTER TABLE "order_attachments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "result_set_attachments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "result_sets" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_workflow" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_workflow_stage" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workflow_template" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workflow_template_stage" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stage_catalog" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_event_attachments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_event_order_attachments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint

ALTER TABLE "promo_code_redemptions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "promo_codes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_product_snapshots" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "price_overrides" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP VIEW IF EXISTS "public"."order_details_view" CASCADE;--> statement-breakpoint
DROP TABLE "guests" CASCADE;--> statement-breakpoint
DROP TABLE "order_product" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "order_stages" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "order_stage_files" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "order_stage_history" CASCADE;--> statement-breakpoint

DROP TABLE "order_attachments" CASCADE;--> statement-breakpoint
DROP TABLE "result_set_attachments" CASCADE;--> statement-breakpoint
DROP TABLE "result_sets" CASCADE;--> statement-breakpoint
DROP TABLE "orders" CASCADE;--> statement-breakpoint
DROP TABLE "order_workflow" CASCADE;--> statement-breakpoint
DROP TABLE "order_workflow_stage" CASCADE;--> statement-breakpoint
DROP TABLE "workflow_template" CASCADE;--> statement-breakpoint
DROP TABLE "workflow_template_stage" CASCADE;--> statement-breakpoint
DROP TABLE "stage_catalog" CASCADE;--> statement-breakpoint
DROP TABLE "order_event_attachments" CASCADE;--> statement-breakpoint
DROP TABLE "order_event_order_attachments" CASCADE;--> statement-breakpoint
DROP TABLE "order_events" CASCADE;--> statement-breakpoint

DROP TABLE "promo_code_redemptions" CASCADE;--> statement-breakpoint
DROP TABLE "promo_codes" CASCADE;--> statement-breakpoint
DROP TABLE "order_product_snapshots" CASCADE;--> statement-breakpoint
DROP TABLE "price_overrides" CASCADE;--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."attachment_type";--> statement-breakpoint
CREATE TYPE "public"."attachment_type" AS ENUM('gerber', 'bom', 'centroid', 'schematic', 'assembly_drawing', 'pick_and_place', 'specification', 'other');--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "type" SET DATA TYPE "public"."attachment_type" USING "type"::"public"."attachment_type";--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."ticket_type_enum";--> statement-breakpoint
CREATE TYPE "public"."ticket_type_enum" AS ENUM('question', 'feedback', 'complaint', 'general');--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "type" SET DATA TYPE "public"."ticket_type_enum" USING "type"::"public"."ticket_type_enum";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "factory_id" uuid;--> statement-breakpoint
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_bom_revision_id_bom_revisions_id_fk" FOREIGN KEY ("bom_revision_id") REFERENCES "public"."bom_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_revisions" ADD CONSTRAINT "bom_revisions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_bom_revision_id_bom_revisions_id_fk" FOREIGN KEY ("bom_revision_id") REFERENCES "public"."bom_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bom_item_revision_idx" ON "bom_items" USING btree ("bom_revision_id");--> statement-breakpoint
CREATE INDEX "bom_revision_product_idx" ON "bom_revisions" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "bom_revision_status_idx" ON "bom_revisions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_factory_idx" ON "products" USING btree ("factory_id");--> statement-breakpoint
CREATE INDEX "product_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "work_order_factory_idx" ON "work_orders" USING btree ("factory_id");--> statement-breakpoint
CREATE INDEX "work_order_bom_revision_idx" ON "work_orders" USING btree ("bom_revision_id");--> statement-breakpoint
CREATE INDEX "work_order_status_idx" ON "work_orders" USING btree ("status");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_factory_idx" ON "users" USING btree ("factory_id");--> statement-breakpoint


DROP TYPE "public"."order_event_action_type_enum";--> statement-breakpoint
DROP TYPE "public"."order_event_info_type_enum";--> statement-breakpoint
DROP TYPE "public"."order_event_type_enum";--> statement-breakpoint
DROP TYPE "public"."order_stages_name_enum" CASCADE;--> statement-breakpoint
DROP TYPE "public"."order_status_enum" CASCADE;--> statement-breakpoint

DROP TYPE "public"."price_overrides_status_enum" CASCADE;--> statement-breakpoint
DROP TYPE "public"."price_overrides_type_enum" CASCADE;--> statement-breakpoint
DROP TYPE "public"."order_product_snapshot_source_enum" CASCADE;--> statement-breakpoint
DROP TYPE "public"."stage_status_enum" CASCADE;--> statement-breakpoint
DROP TYPE "public"."workflow_complexity_enum" CASCADE;--> statement-breakpoint
DROP TYPE "public"."workflow_priority_enum" CASCADE;--> statement-breakpoint
DROP TYPE "public"."workflow_type_enum" CASCADE;--> statement-breakpoint

DROP TYPE "public"."result_status";--> statement-breakpoint
DROP TYPE "public"."result_type";--> statement-breakpoint
DROP TYPE "public"."promo_code_type_enum";