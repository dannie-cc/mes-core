CREATE TYPE "public"."order_status_enum" AS ENUM('inactive', 'active', 'successfull', 'canceled');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "status" "order_status_enum" DEFAULT 'inactive' NOT NULL;--> statement-breakpoint
DROP TYPE "public"."order_stages_status_enum";