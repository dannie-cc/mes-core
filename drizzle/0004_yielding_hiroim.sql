DROP TYPE IF EXISTS "public"."ticket_status_enum";
DROP TYPE IF EXISTS "public"."ticket_type_enum";
DROP TYPE IF EXISTS "public"."sender_type_enum";
DROP TYPE IF EXISTS "public"."message_type_enum";
CREATE TYPE "public"."ticket_status_enum" AS ENUM('open', 'closed', 'in_progress', 'resolved', 'archived');
CREATE TYPE "public"."ticket_type_enum" AS ENUM('question', 'quotation', 'feedback', 'complaint', 'general');--> statement-breakpoint
CREATE TYPE "public"."message_type_enum" AS ENUM('message', 'status_change', 'note');--> statement-breakpoint
CREATE TYPE "public"."sender_type_enum" AS ENUM('user', 'admin', 'system');--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"company" varchar(100),
	"type" "ticket_type_enum" NOT NULL,
	"subject" varchar(2000) NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now(),
	"ip_address" "inet",
	"status" "ticket_status_enum" DEFAULT 'open' NOT NULL,
	"ticket_number" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"attachment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"content" text NOT NULL,
	"sender_id" uuid,
	"sender_type" "sender_type_enum" DEFAULT 'user',
	"is_internal" boolean DEFAULT false,
	"metadata" jsonb,
	"message_type" "message_type_enum" DEFAULT 'message',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_ticket_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ticket_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
