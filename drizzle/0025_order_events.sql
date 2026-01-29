CREATE TYPE "public"."order_event_action_type_enum" AS ENUM('gerber_revision', 'consent', 'feedback', 'payment', 'shipment_address');--> statement-breakpoint
CREATE TYPE "public"."order_event_info_type_enum" AS ENUM('in_progress', 'evidence');--> statement-breakpoint
CREATE TYPE "public"."order_event_type_enum" AS ENUM('action', 'info');--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"stage_key" "order_stages_name_enum" NOT NULL,
	"is_internal" boolean NOT NULL,
	"type" "order_event_type_enum" NOT NULL,
	"action_type" "order_event_action_type_enum",
	"info_type" "order_event_info_type_enum",
	"attachment_ids" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	"action_event_id" uuid,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_type_must_exist" CHECK (("order_events"."type" <> 'action'::order_event_type_enum OR "order_events"."action_type" IS NOT NULL)),
	CONSTRAINT "info_type_must_exist" CHECK (("order_events"."type" <> 'info'::order_event_type_enum OR "order_events"."info_type" IS NOT NULL)),
	CONSTRAINT "type_field_exclusivity" CHECK (
    (
      "order_events"."type" = 'action'::order_event_type_enum
      AND "order_events"."action_type" IS NOT NULL
      AND "order_events"."info_type" IS NULL
    )
    OR
    (
      "order_events"."type" = 'info'::order_event_type_enum
      AND "order_events"."info_type" IS NOT NULL
      AND "order_events"."action_type" IS NULL
    )
    OR
    (
      "order_events"."type" NOT IN ('action'::order_event_type_enum, 'info'::order_event_type_enum)
    )
  )
);
--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_action_event_id_order_events_id_fk" FOREIGN KEY ("action_event_id") REFERENCES "public"."order_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_events__order__created_idx" ON "order_events" USING btree ("order_id","_created");--> statement-breakpoint
CREATE INDEX "order_events__stage_idx" ON "order_events" USING btree ("stage_key");--> statement-breakpoint
CREATE INDEX "order_events__type_idx" ON "order_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "order_events__action_event_idx" ON "order_events" USING btree ("action_event_id");