CREATE TYPE "public"."price_overrides_status_enum" AS ENUM('waiting_approval', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."price_overrides_type_enum" AS ENUM('quote', 'shipping');--> statement-breakpoint
CREATE TYPE "public"."order_product_snapshot_source_enum" AS ENUM('initial', 'manual_price_revision', 'product_revision', 'system_reprice');--> statement-breakpoint
CREATE TABLE "order_product_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"source" "order_product_snapshot_source_enum" NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"breakdown" jsonb NOT NULL,
	"specifications" jsonb,
	"panelization" jsonb,
	"exchange_snapshot" jsonb NOT NULL,
	"pricing_algo_version" varchar(50),
	"_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"_created" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"old_snapshot_id" uuid NOT NULL,
	"new_snapshot_id" uuid NOT NULL,
	"old_amount" numeric(10, 2) NOT NULL,
	"new_amount" numeric(10, 2) NOT NULL,
	"status" "price_overrides_status_enum" DEFAULT 'waiting_approval' NOT NULL,
	"type" "price_overrides_type_enum" NOT NULL,
	"reason" varchar(255),
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"_deleted" timestamp with time zone,
	CONSTRAINT "old_amount_positive" CHECK ("price_overrides"."old_amount" > 0),
	CONSTRAINT "new_amount_positive" CHECK ("price_overrides"."new_amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "order_product" ADD COLUMN "product_snapshot_id" uuid;--> statement-breakpoint

-- 1) Add as nullable first
ALTER TABLE "order_product"
  ADD COLUMN "exchange_snapshot" jsonb;
--> statement-breakpoint

-- 2) Backfill existing rows with an empty object
UPDATE "order_product"
SET "exchange_snapshot" = '{}'::jsonb
WHERE "exchange_snapshot" IS NULL;
--> statement-breakpoint

-- 3) Enforce NOT NULL (no default, so app must send real data for new rows)
ALTER TABLE "order_product"
  ALTER COLUMN "exchange_snapshot" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "order_product_snapshots" ADD CONSTRAINT "order_product_snapshots_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_overrides" ADD CONSTRAINT "price_overrides_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_overrides" ADD CONSTRAINT "price_overrides_old_snapshot_id_order_product_snapshots_id_fk" FOREIGN KEY ("old_snapshot_id") REFERENCES "public"."order_product_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_overrides" ADD CONSTRAINT "price_overrides_new_snapshot_id_order_product_snapshots_id_fk" FOREIGN KEY ("new_snapshot_id") REFERENCES "public"."order_product_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_product_snapshot_order_idx" ON "order_product_snapshots" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_product_snapshot_current_idx" ON "order_product_snapshots" USING btree ("order_id","is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "order_product_snapshot_version_idx" ON "order_product_snapshots" USING btree ("order_id","version");--> statement-breakpoint
CREATE INDEX "price_override_order_idx" ON "price_overrides" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "price_override_status_idx" ON "price_overrides" USING btree ("status");--> statement-breakpoint
CREATE INDEX "price_override_date_idx" ON "price_overrides" USING btree ("_created");--> statement-breakpoint
CREATE INDEX "price_override_type_idx" ON "price_overrides" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "price_override_new_snapshot_pending_unique" ON "price_overrides" USING btree ("new_snapshot_id") WHERE "price_overrides"."_deleted" IS NULL AND "price_overrides"."status" = 'waiting_approval';--> statement-breakpoint
ALTER TABLE "order_product" ADD CONSTRAINT "order_product_product_snapshot_id_order_product_snapshots_id_fk" FOREIGN KEY ("product_snapshot_id") REFERENCES "public"."order_product_snapshots"("id") ON DELETE set null ON UPDATE no action;
