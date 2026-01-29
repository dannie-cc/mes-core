DROP TYPE IF EXISTS "public"."order_stages_name_enum";
DROP TYPE IF EXISTS "public"."order_stages_status_enum";
DROP TYPE IF EXISTS "public"."currency_enum";
CREATE TYPE "public"."order_stages_name_enum" AS ENUM('draft', 'contract_signature', 'payment', 'engineering_review', 'component_sourcing', 'production', 'assembly', 'testing', 'quality_control', 'packaging', 'shipping', 'customs', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."order_stages_status_enum" AS ENUM('pending', 'in_progress', 'on_hold', 'awaiting_payment', 'completed', 'cancelled', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."currency_enum" AS ENUM('USD', 'EUR', 'TRY', 'CNY');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"type" varchar(50) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"filesize" integer,
	"is_uploaded" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"_created" timestamp DEFAULT now() NOT NULL,
	"_updated" timestamp DEFAULT now() NOT NULL,
	"_deleted" timestamp,
	CONSTRAINT "attachment_size_positive" CHECK ("attachments"."filesize" > 0),
	CONSTRAINT "attachment_valid_type" CHECK ("attachments"."type" IN ('gerber', 'bom', 'centroid', 'schematic', 'assembly_drawing', 'pick_and_place', 'specification', 'other'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"way" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"description" varchar(1000) NOT NULL,
	"read_at" timestamp,
	"data" jsonb,
	"_created" timestamp DEFAULT now() NOT NULL,
	"_updated" timestamp DEFAULT now() NOT NULL,
	"_deleted" timestamp
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"tracking_number" varchar(255),
	"total_amount" numeric(10, 2) NOT NULL,
	"currency" "currency_enum" DEFAULT 'USD' NOT NULL,
	"metadata" jsonb,
	"_created" timestamp DEFAULT now() NOT NULL,
	"_updated" timestamp DEFAULT now() NOT NULL,
	"_deleted" timestamp,
	CONSTRAINT "order_total_amount_non_negative" CHECK ("orders"."total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255),
	"type" varchar(50) NOT NULL,
	"conditions" jsonb NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"multipliers" jsonb,
	"currency" "currency_enum" DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp,
	"_created" timestamp DEFAULT now() NOT NULL,
	"_updated" timestamp DEFAULT now() NOT NULL,
	"_deleted" timestamp
);
--> statement-breakpoint

--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"is_verified" boolean DEFAULT false,
	"verification_token" varchar(255),
	"_created" timestamp DEFAULT now() NOT NULL,
	"_updated" timestamp DEFAULT now() NOT NULL,
	"_deleted" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "order_stage_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_stage_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"file_size" integer,
	"uploaded_by" uuid,
	"metadata" jsonb,
	"_created" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_stage_id" uuid NOT NULL,
	"previous_status" varchar(50),
	"new_status" varchar(50) NOT NULL,
	"change_reason" varchar(500),
	"changed_by" uuid,
	"metadata" jsonb,
	"_created" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"stage_name" "order_stages_name_enum" NOT NULL,
	"status" "order_stages_status_enum" DEFAULT 'pending' NOT NULL,
	"details" varchar(500),
	"sequence" integer NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"estimated_days" integer DEFAULT 1,
	"metadata" jsonb,
	"_created" timestamp DEFAULT now() NOT NULL,
	"_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stage_sequence_positive" CHECK ("order_stages"."sequence" > 0),
	CONSTRAINT "stage_estimated_days_positive" CHECK ("order_stages"."estimated_days" > 0),
	CONSTRAINT "stage_valid_status" CHECK ("order_stages"."status" IN ('pending', 'in_progress', 'on_hold', 'awaiting_payment', 'completed', 'cancelled', 'refunded', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "order_stage_files" ADD CONSTRAINT "order_stage_files_order_stage_id_order_stages_id_fk" FOREIGN KEY ("order_stage_id") REFERENCES "public"."order_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stage_files" ADD CONSTRAINT "order_stage_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stage_history" ADD CONSTRAINT "order_stage_history_order_stage_id_order_stages_id_fk" FOREIGN KEY ("order_stage_id") REFERENCES "public"."order_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stage_history" ADD CONSTRAINT "order_stage_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_stages" ADD CONSTRAINT "order_stages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachment_user_idx" ON "attachments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attachment_order_idx" ON "attachments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "attachment_type_idx" ON "attachments" USING btree ("type");--> statement-breakpoint
CREATE INDEX "attachment_date_idx" ON "attachments" USING btree ("_created");--> statement-breakpoint
CREATE INDEX "attachment_user_date_idx" ON "attachments" USING btree ("user_id","_created");--> statement-breakpoint
CREATE INDEX "attachment_user_type_idx" ON "attachments" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "attachment_order_date_idx" ON "attachments" USING btree ("order_id","_created");--> statement-breakpoint
CREATE INDEX "user_order_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_date_range_idx" ON "orders" USING btree ("order_date");--> statement-breakpoint
CREATE INDEX "user_date_idx" ON "orders" USING btree ("user_id","order_date");--> statement-breakpoint
CREATE INDEX "order_metadata_gin_idx" ON "orders" USING gin ("metadata");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_tracking_number" ON "orders" USING btree ("tracking_number") WHERE tracking_number IS NOT NULL;--> statement-breakpoint

CREATE INDEX "user_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_first_name_idx" ON "users" USING btree ("first_name");--> statement-breakpoint
CREATE INDEX "user_last_name_idx" ON "users" USING btree ("last_name");--> statement-breakpoint
CREATE INDEX "stage_files_stage_idx" ON "order_stage_files" USING btree ("order_stage_id");--> statement-breakpoint
CREATE INDEX "stage_files_type_idx" ON "order_stage_files" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "stage_files_uploaded_by_idx" ON "order_stage_files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "stage_history_stage_idx" ON "order_stage_history" USING btree ("order_stage_id");--> statement-breakpoint
CREATE INDEX "stage_history_date_idx" ON "order_stage_history" USING btree ("_created");--> statement-breakpoint
CREATE INDEX "stage_history_changed_by_idx" ON "order_stage_history" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "order_stages_order_idx" ON "order_stages" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_stages_sequence_idx" ON "order_stages" USING btree ("order_id","sequence");--> statement-breakpoint
CREATE INDEX "order_stages_active_idx" ON "order_stages" USING btree ("order_id","is_active");--> statement-breakpoint
CREATE INDEX "order_stages_status_idx" ON "order_stages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_stages_name_idx" ON "order_stages" USING btree ("stage_name");--> statement-breakpoint
CREATE VIEW "public"."order_details_view" AS (
SELECT
    -- Order information
    o.id as order_id,
    o.user_id,
    (o.metadata->'product'->>'quantity')::integer as quantity,
    o.order_date,
    o.shipping_address,
    o.tracking_number,
    o.total_amount,
    o.currency,
    o.metadata as order_metadata,
    o._created as order_created_at,
    o._updated as order_updated_at,

    -- Current active stage information (for quick access)
    current_stage.id as current_stage_id,
    current_stage.stage_name as current_stage_name,
    current_stage.status as current_stage_status,
    current_stage.details as current_stage_details,
    current_stage.sequence as current_stage_sequence,
    current_stage.estimated_days as current_stage_estimated_days,

    -- ALL stages information aggregated as JSON for frontend timeline
    COALESCE(
        json_agg(
            json_build_object(
                'id', all_stages.id,
                'stageName', all_stages.stage_name,
                'status', all_stages.status,
                'details', all_stages.details,
                'sequence', all_stages.sequence,
                'estimatedDays', all_stages.estimated_days,
                'isActive', all_stages.is_active,
                'metadata', all_stages.metadata,
                'createdAt', all_stages._created,
                'updatedAt', all_stages._updated,
                'filesCount', COALESCE(stage_files.files_count, 0)
            ) ORDER BY all_stages.sequence
        ) FILTER (WHERE all_stages.id IS NOT NULL),
        '[]'::json
    ) as all_stages,

    -- Computed fields for easy frontend consumption
    CASE
        WHEN current_stage.status = 'cancelled' THEN 'cancelled'
        WHEN current_stage.status = 'refunded' THEN 'refunded'
        WHEN current_stage.stage_name = 'delivery' AND current_stage.status = 'completed' THEN 'delivered'
        WHEN current_stage.status = 'completed' THEN 'processing'
        WHEN current_stage.status = 'in_progress' THEN 'processing'
        WHEN current_stage.status = 'on_hold' THEN 'on_hold'
        WHEN current_stage.status = 'awaiting_payment' THEN 'awaiting_payment'
        WHEN current_stage.status = 'failed' THEN 'failed'
        ELSE 'pending'
    END as overall_status,

    -- Progress calculation
    CASE
        WHEN stage_counts.total_stages > 0 THEN
            ROUND(
                (current_stage.sequence::decimal / stage_counts.total_stages::decimal) * 100,
                2
            )
        ELSE 0
    END as progress_percentage,

    -- Stage counts
    stage_counts.total_stages,
    stage_counts.completed_stages,
    stage_counts.in_progress_stages,
    stage_counts.pending_stages,
    stage_counts.on_hold_stages,

    -- Files count for current stage
    COALESCE(current_stage_files.files_count, 0) as current_stage_files_count,

    -- Total files across all stages
    COALESCE(total_files.total_files_count, 0) as total_files_count,

    -- Workflow information extracted from metadata
    o.metadata->'workflow'->>'type' as workflow_type,
    o.metadata->'product'->>'type' as product_type,
    o.metadata->'product'->>'complexity' as product_complexity,
    o.metadata->'business'->>'priority' as business_priority

FROM "orders" o
LEFT JOIN "order_stages" current_stage ON (
    current_stage.order_id = o.id
    AND current_stage.is_active = true
)
LEFT JOIN "order_stages" all_stages ON all_stages.order_id = o.id
LEFT JOIN (
    SELECT
        "order_stages"."order_id" as order_id,
        COUNT(*) as total_stages,
        COUNT(CASE WHEN "order_stages"."status" = 'completed' THEN 1 END) as completed_stages,
        COUNT(CASE WHEN "order_stages"."status" = 'in_progress' THEN 1 END) as in_progress_stages,
        COUNT(CASE WHEN "order_stages"."status" = 'pending' THEN 1 END) as pending_stages,
        COUNT(CASE WHEN "order_stages"."status" = 'on_hold' THEN 1 END) as on_hold_stages
    FROM "order_stages"
    GROUP BY "order_stages"."order_id"
) stage_counts ON stage_counts.order_id = o.id
LEFT JOIN (
    SELECT
        osf.order_stage_id,
        COUNT(*) as files_count
    FROM "order_stage_files" osf
    GROUP BY osf.order_stage_id
) stage_files ON stage_files.order_stage_id = all_stages.id
LEFT JOIN (
    SELECT
        "order_stage_files"."order_stage_id" as order_stage_id,
        COUNT(*) as files_count
    FROM "order_stage_files"
    GROUP BY "order_stage_files"."order_stage_id"
) current_stage_files ON current_stage_files.order_stage_id = current_stage.id
LEFT JOIN (
    SELECT
        os.order_id,
        COUNT(osf.*) as total_files_count
    FROM "order_stages" os
    LEFT JOIN "order_stage_files" osf ON osf.order_stage_id = os.id
    GROUP BY os.order_id
) total_files ON total_files.order_id = o.id
WHERE o._deleted IS NULL
GROUP BY
    o.id, o.user_id, o.order_date, o.shipping_address, o.tracking_number,
    o.total_amount, o.currency, o.metadata, o._created, o._updated,
    current_stage.id, current_stage.stage_name, current_stage.status, current_stage.details,
    current_stage.sequence, current_stage.estimated_days,
    stage_counts.total_stages, stage_counts.completed_stages, stage_counts.in_progress_stages,
    stage_counts.pending_stages, stage_counts.on_hold_stages, current_stage_files.files_count, total_files.total_files_count
);
