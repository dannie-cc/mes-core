CREATE TABLE "order_event_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"attachment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_event_order_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"order_attachment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "order_event_attachments" ADD CONSTRAINT "order_event_attachments_event_id_order_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."order_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event_attachments" ADD CONSTRAINT "order_event_attachments_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event_order_attachments" ADD CONSTRAINT "order_event_order_attachments_event_id_order_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."order_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event_order_attachments" ADD CONSTRAINT "order_event_order_attachments_order_attachment_id_order_attachments_id_fk" FOREIGN KEY ("order_attachment_id") REFERENCES "public"."order_attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_event_attachments_event_attachment_uniq" ON "order_event_attachments" USING btree ("event_id","attachment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_event_order_attachment_uniq" ON "order_event_order_attachments" USING btree ("event_id","order_attachment_id");--> statement-breakpoint
ALTER TABLE "order_events" DROP COLUMN "attachment_ids";
