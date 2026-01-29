CREATE TABLE "order_workflow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255),
	"type" "workflow_type_enum" NOT NULL,
	"priority" "workflow_priority_enum" NOT NULL,
	"complexity" "workflow_complexity_enum" NOT NULL,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_workflow_stage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"stage_type_key" "order_stages_name_enum" NOT NULL,
	"stage_type_version" integer NOT NULL,
	"displayName" varchar(255) NOT NULL,
	"required" boolean NOT NULL,
	"approval_needed" boolean NOT NULL,
	"estimated_days" integer NOT NULL,
	"dependencies" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prev_stage_id" uuid,
	"next_stage_id" uuid,
	"position_x" integer DEFAULT 0 NOT NULL,
	"position_y" integer DEFAULT 0 NOT NULL,
	"status" "stage_status_enum" DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"completed_by" uuid,
	"approved_by" uuid,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"description" varchar(255),
	"type" "workflow_type_enum" NOT NULL,
	"priority" "workflow_priority_enum" DEFAULT 'normal' NOT NULL,
	"complexity" "workflow_complexity_enum" NOT NULL,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_template_stage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"stage_type_key" "order_stages_name_enum" NOT NULL,
	"stage_type_version" integer NOT NULL,
	"displayName" varchar(255) NOT NULL,
	"required" boolean NOT NULL,
	"approval_needed" boolean NOT NULL,
	"estimated_days" integer NOT NULL,
	"dependencies" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prev_stage_id" uuid,
	"next_stage_id" uuid,
	"position_x" integer DEFAULT 0 NOT NULL,
	"position_y" integer DEFAULT 0 NOT NULL,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "order_stages_name_enum" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"options" jsonb NOT NULL,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_workflow" ADD CONSTRAINT "order_workflow_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_workflow" ADD CONSTRAINT "order_workflow_template_id_workflow_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflow_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_workflow_stage" ADD CONSTRAINT "order_workflow_stage_workflow_id_order_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."order_workflow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_workflow_stage" ADD CONSTRAINT "order_workflow_stage_prev_stage_id_order_workflow_stage_id_fk" FOREIGN KEY ("prev_stage_id") REFERENCES "public"."order_workflow_stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_workflow_stage" ADD CONSTRAINT "order_workflow_stage_next_stage_id_order_workflow_stage_id_fk" FOREIGN KEY ("next_stage_id") REFERENCES "public"."order_workflow_stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_template_stage" ADD CONSTRAINT "workflow_template_stage_template_id_workflow_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflow_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_template_stage" ADD CONSTRAINT "workflow_template_stage_prev_stage_id_workflow_template_stage_id_fk" FOREIGN KEY ("prev_stage_id") REFERENCES "public"."workflow_template_stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_template_stage" ADD CONSTRAINT "workflow_template_stage_next_stage_id_workflow_template_stage_id_fk" FOREIGN KEY ("next_stage_id") REFERENCES "public"."workflow_template_stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_instance_order_idx" ON "order_workflow" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "workflow_instance_template_idx" ON "order_workflow" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "workflow_instance_type_idx" ON "order_workflow" USING btree ("type");--> statement-breakpoint
CREATE INDEX "stage_instance_workflow_idx" ON "order_workflow_stage" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "stage_instance_status_idx" ON "order_workflow_stage" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stage_instance_type_idx" ON "order_workflow_stage" USING btree ("stage_type_key","stage_type_version");--> statement-breakpoint
CREATE INDEX "stage_instance_position_idx" ON "order_workflow_stage" USING btree ("position_y","position_x");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_template_key_version_uniq" ON "workflow_template" USING btree ("key","version");--> statement-breakpoint
CREATE INDEX "workflow_template_enabled_idx" ON "workflow_template" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "workflow_template_type_idx" ON "workflow_template" USING btree ("type");--> statement-breakpoint
CREATE INDEX "workflow_stage_template_idx" ON "workflow_template_stage" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "workflow_stage_type_idx" ON "workflow_template_stage" USING btree ("stage_type_key","stage_type_version");--> statement-breakpoint
CREATE INDEX "workflow_stage_position_idx" ON "workflow_template_stage" USING btree ("position_y","position_x");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_catalog_key_version_uniq" ON "stage_catalog" USING btree ("key","version");--> statement-breakpoint
CREATE INDEX "stage_catalog_enabled_idx" ON "stage_catalog" USING btree ("enabled");
