DROP TYPE IF EXISTS "public"."attachment_type";
DROP TYPE IF EXISTS "public"."result_status";
DROP TYPE IF EXISTS "public"."result_type";
CREATE TYPE "public"."attachment_type" AS ENUM('gerber', 'bom', 'centroid', 'schematic', 'assembly_drawing', 'pick_and_place', 'specification', 'other');--> statement-breakpoint
CREATE TYPE "public"."result_status" AS ENUM('passed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."result_type" AS ENUM('dfm', 'smt');--> statement-breakpoint

CREATE TABLE "order_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"attachment_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"type" "attachment_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "result_set_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_set_id" uuid NOT NULL,
	"order_attachment_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "result_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"type" "result_type" NOT NULL,
	"status" "result_status" NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" DROP CONSTRAINT "attachment_valid_type";--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "type" SET DATA TYPE "public"."attachment_type" USING "type"::"public"."attachment_type";--> statement-breakpoint
ALTER TABLE "order_attachments" ADD CONSTRAINT "order_attachments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_attachments" ADD CONSTRAINT "order_attachments_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_set_attachments" ADD CONSTRAINT "result_set_attachments_result_set_id_result_sets_id_fk" FOREIGN KEY ("result_set_id") REFERENCES "public"."result_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_set_attachments" ADD CONSTRAINT "result_set_attachments_order_attachment_id_order_attachments_id_fk" FOREIGN KEY ("order_attachment_id") REFERENCES "public"."order_attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "result_sets" ADD CONSTRAINT "result_sets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_attachment_order_idx" ON "order_attachments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_attachment_attachment_idx" ON "order_attachments" USING btree ("attachment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_order_attachment_version" ON "order_attachments" USING btree ("order_id","version","type");--> statement-breakpoint
CREATE INDEX "rs_attach_result_idx" ON "result_set_attachments" USING btree ("result_set_id");--> statement-breakpoint
CREATE INDEX "rs_attach_order_attach_idx" ON "result_set_attachments" USING btree ("order_attachment_id");--> statement-breakpoint
CREATE INDEX "result_sets_order_idx" ON "result_sets" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "result_sets_type_idx" ON "result_sets" USING btree ("type");
