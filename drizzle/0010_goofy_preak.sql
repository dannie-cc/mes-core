ALTER TABLE "attachments" DROP CONSTRAINT "attachments_order_id_orders_id_fk";
--> statement-breakpoint
DROP INDEX "attachment_order_idx";--> statement-breakpoint
DROP INDEX "attachment_order_date_idx";--> statement-breakpoint
ALTER TABLE "attachments" DROP COLUMN "order_id";