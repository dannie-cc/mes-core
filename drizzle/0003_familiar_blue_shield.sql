CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(255),
	"company" varchar(255),
	"line1" varchar(255) NOT NULL,
	"line2" varchar(255),
	"city" varchar(255) NOT NULL,
	"state" varchar(255),
	"postal_code" varchar(255) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"_created" timestamp DEFAULT now() NOT NULL,
	"_updated" timestamp DEFAULT now() NOT NULL,
	"_deleted" timestamp
);
--> statement-breakpoint
DROP VIEW "public"."order_details_view";--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_address_user_idx" ON "user_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_address_default_idx" ON "user_addresses" USING btree ("user_id","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "user_default_address_unique" ON "user_addresses" USING btree ("user_id") WHERE is_default IS TRUE;--> statement-breakpoint
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
    o.metadata as metadata,
    o._created as order_created_at,
    o._updated as order_updated_at,
    o._deleted as order_deleted_at,

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
    o.metadata->'business'->>'priority' as business_priority,
    o.metadata->'business'->>'customerTier' as customer_tier,
    o.metadata->'business'->>'rushOrder' as is_rush_order

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
    o.total_amount, o.currency, o.metadata, o._created, o._updated, o._deleted,
    current_stage.id, current_stage.stage_name, current_stage.status, current_stage.details,
    current_stage.sequence, current_stage.estimated_days,
    stage_counts.total_stages, stage_counts.completed_stages, stage_counts.in_progress_stages,
    stage_counts.pending_stages, stage_counts.on_hold_stages, current_stage_files.files_count, total_files.total_files_count
);