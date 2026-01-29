DROP VIEW "public"."order_details_view";--> statement-breakpoint

UPDATE "orders"
SET tracking_number = 
    'ORD-' || to_char(coalesce(order_date, now()), 'YYYYMMDD')
    || '-' || lpad(floor(random()*1000000)::text, 5, '0')
WHERE tracking_number IS NULL;

ALTER TABLE "attachments" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "_created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "_created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "_updated" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "_updated" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "_deleted" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "read_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "_created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "_created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "_updated" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "_updated" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "_deleted" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_date" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "tracking_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "_created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "_created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "_updated" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "_updated" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "_deleted" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pricing_rules" ALTER COLUMN "valid_from" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pricing_rules" ALTER COLUMN "valid_to" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pricing_rules" ALTER COLUMN "_created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pricing_rules" ALTER COLUMN "_created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "pricing_rules" ALTER COLUMN "_updated" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pricing_rules" ALTER COLUMN "_updated" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "pricing_rules" ALTER COLUMN "_deleted" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "_created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "_created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "_updated" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "_updated" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "_deleted" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_stage_files" ALTER COLUMN "_created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_stage_files" ALTER COLUMN "_created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_stage_history" ALTER COLUMN "_created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_stage_history" ALTER COLUMN "_created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_stages" ALTER COLUMN "_created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_stages" ALTER COLUMN "_created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_stages" ALTER COLUMN "_updated" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_stages" ALTER COLUMN "_updated" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_addresses" ALTER COLUMN "_created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_addresses" ALTER COLUMN "_created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_addresses" ALTER COLUMN "_updated" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_addresses" ALTER COLUMN "_updated" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_addresses" ALTER COLUMN "_deleted" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_attachments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_attachments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "result_set_attachments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "result_set_attachments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "result_sets" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "result_sets" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "result_sets" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "result_sets" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
CREATE VIEW "public"."order_details_view" AS (
WITH attachments_latest AS (
    SELECT
      oa.order_id,
      jsonb_agg(
        jsonb_build_object(
          'orderAttachmentId', oa.id,
          'attachmentId', oa.attachment_id,
          'type', oa.type,
          'version', oa.version,
          'resultSetId', rs.id,
          'status', rs.status
        )
      ) AS latest_attachments
    FROM (
      SELECT DISTINCT ON (oa.order_id, oa.type)
        oa.*
      FROM order_attachments oa
      ORDER BY oa.order_id, oa.type, oa.version DESC
    ) oa
    LEFT JOIN result_set_attachments rsa ON rsa.order_attachment_id = oa.id
    LEFT JOIN result_sets rs ON rs.id = rsa.result_set_id
    GROUP BY oa.order_id
)
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
    o.metadata,
    o._created as order_created_at,
    o._updated as order_updated_at,
    o._deleted as order_deleted_at,

    -- Current active stage
    current_stage.id as current_stage_id,
    current_stage.stage_name as current_stage_name,
    current_stage.status as current_stage_status,
    current_stage.sequence as current_stage_sequence,
    current_stage.estimated_days as current_stage_estimated_days,

    -- ALL stages JSON
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

    COALESCE(a.latest_attachments, '[]'::jsonb) as latest_attachments,

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

    -- Progress % calc
    CASE
        WHEN stage_counts.total_stages > 0 THEN
            ROUND((current_stage.sequence::decimal / stage_counts.total_stages::decimal) * 100, 2)
        ELSE 0
    END as progress_percentage,

    -- Stage counts
    stage_counts.total_stages,
    stage_counts.completed_stages,
    stage_counts.in_progress_stages,
    stage_counts.pending_stages,
    stage_counts.on_hold_stages,

    COALESCE(current_stage_files.files_count, 0) as current_stage_files_count,
    COALESCE(total_files.total_files_count, 0) as total_files_count,

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
  SELECT os.order_id,
         COUNT(*) as total_stages,
         COUNT(CASE WHEN os.status = 'completed' THEN 1 END) as completed_stages,
         COUNT(CASE WHEN os.status = 'in_progress' THEN 1 END) as in_progress_stages,
         COUNT(CASE WHEN os.status = 'pending' THEN 1 END) as pending_stages,
         COUNT(CASE WHEN os.status = 'on_hold' THEN 1 END) as on_hold_stages
  FROM "order_stages" os
  GROUP BY os.order_id
) stage_counts ON stage_counts.order_id = o.id

LEFT JOIN (
  SELECT osf.order_stage_id, COUNT(*) as files_count
  FROM "order_stage_files" osf
  GROUP BY osf.order_stage_id
) stage_files ON stage_files.order_stage_id = all_stages.id

LEFT JOIN (
  SELECT osf.order_stage_id, COUNT(*) as files_count
  FROM "order_stage_files" osf
  GROUP BY osf.order_stage_id
) current_stage_files ON current_stage_files.order_stage_id = current_stage.id

LEFT JOIN (
  SELECT os.order_id, COUNT(osf.*) as total_files_count
  FROM "order_stages" os
  LEFT JOIN "order_stage_files" osf ON osf.order_stage_id = os.id
  GROUP BY os.order_id
) total_files ON total_files.order_id = o.id

LEFT JOIN attachments_latest a ON a.order_id = o.id

WHERE o._deleted IS NULL
GROUP BY
  o.id, o.user_id, o.order_date, o.shipping_address, o.tracking_number,
  o.total_amount, o.currency, o.metadata, o._created, o._updated, o._deleted,
  current_stage.id, current_stage.stage_name, current_stage.status,
  current_stage.sequence, current_stage.estimated_days,
  stage_counts.total_stages, stage_counts.completed_stages, stage_counts.in_progress_stages,
  stage_counts.pending_stages, stage_counts.on_hold_stages,
  current_stage_files.files_count, total_files.total_files_count,
  a.latest_attachments
);
