CREATE TABLE "order_product" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "order_id" uuid NOT NULL,
    "type" varchar(50) NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10, 2) NOT NULL,
    "breakdown" jsonb NOT NULL,
    "specifications" jsonb,
    "_created" timestamp
    with
        time zone DEFAULT now () NOT NULL,
        "_updated" timestamp
    with
        time zone DEFAULT now () NOT NULL,
        CONSTRAINT "order_product_order_id_unique" UNIQUE ("order_id")
);

--> statement-breakpoint
ALTER TABLE "order_stage_files" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE "order_stage_history" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE "order_stages" DISABLE ROW LEVEL SECURITY;

--> statement-breakpoint
DROP VIEW "public"."order_details_view";

--> statement-breakpoint
DROP TABLE "order_stage_files" CASCADE;

--> statement-breakpoint
DROP TABLE "order_stage_history" CASCADE;

--> statement-breakpoint
DROP TABLE "order_stages" CASCADE;

--> statement-breakpoint
ALTER TABLE "orders"
RENAME COLUMN "total_amount" TO "total_price";

--> statement-breakpoint
ALTER TABLE "orders"
DROP CONSTRAINT "order_total_amount_non_negative";

--> statement-breakpoint
ALTER TABLE "order_workflow"
DROP CONSTRAINT "order_workflow_order_id_orders_id_fk";

--> statement-breakpoint
DROP INDEX "order_metadata_gin_idx";

--> statement-breakpoint
ALTER TABLE "orders"
ADD COLUMN "workflow_id" uuid;

--> statement-breakpoint
ALTER TABLE "orders"
ADD COLUMN "shipping_price" numeric(10, 2);

--> statement-breakpoint
UPDATE "orders"
SET
    shipping_price = 0
WHERE
    shipping_price IS NULL;

ALTER TABLE "orders"
ALTER COLUMN "shipping_price" TYPE numeric(10, 2),
ALTER COLUMN "shipping_price"
SET
    NOT NULL;

--> statement-breakpoint
ALTER TABLE "orders"
ADD COLUMN "initial_total_price" numeric(10, 2);

--> statement-breakpoint
UPDATE "orders"
SET
    initial_total_price = total_price
WHERE
    initial_total_price IS NULL;

ALTER TABLE "orders"
ALTER COLUMN "initial_total_price" TYPE numeric(10, 2),
ALTER COLUMN "initial_total_price"
SET
    NOT NULL;

--> statement-breakpoint
ALTER TABLE "orders"
ADD COLUMN "discount_rate" integer;

--> statement-breakpoint
UPDATE "orders"
SET
    discount_rate = 0
WHERE
    discount_rate IS NULL;

ALTER TABLE "orders"
ALTER COLUMN "discount_rate" TYPE integer,
ALTER COLUMN "discount_rate"
SET
    NOT NULL,
ALTER COLUMN "discount_rate"
SET DEFAULT 0;

--> statement-breakpoint
ALTER TABLE "order_product" ADD CONSTRAINT "order_product_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_workflow_id_order_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."order_workflow" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "workflow_idx" ON "orders" USING btree ("workflow_id");

--> statement-breakpoint
ALTER TABLE "orders"
DROP COLUMN "metadata";

--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "order_total_price_non_negative" CHECK ("orders"."total_price" >= 0);

--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "order_initial_total_price_non_negative" CHECK ("orders"."initial_total_price" >= 0);

--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "order_discount_rate_range" CHECK ("orders"."discount_rate" BETWEEN 0 AND 100);
