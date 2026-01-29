CREATE TYPE "public"."promo_code_type_enum" AS ENUM('fixed_amount', 'percentage');--> statement-breakpoint
CREATE TABLE "promo_code_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_code_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_credited" numeric(12, 2) DEFAULT '0' NOT NULL,
	"order_id" uuid,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_redemption_amount_non_negative" CHECK ("promo_code_redemptions"."amount_credited" >= 0)
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"type" "promo_code_type_enum" NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"description" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"max_total_redemptions" integer,
	"max_redemptions_per_user" integer DEFAULT 1 NOT NULL,
	"current_redemptions" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" uuid,
	"_created" timestamp with time zone DEFAULT now() NOT NULL,
	"_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"_deleted" timestamp with time zone,
	CONSTRAINT "promo_code_value_positive" CHECK ("promo_codes"."value" > 0),
	CONSTRAINT "promo_code_fixed_amount_min" CHECK (("promo_codes"."type" = 'fixed_amount' AND "promo_codes"."value" >= 1.00) OR "promo_codes"."type" != 'fixed_amount'),
	CONSTRAINT "promo_code_percentage_range" CHECK (("promo_codes"."type" = 'percentage' AND "promo_codes"."value" >= 1 AND "promo_codes"."value" <= 100) OR "promo_codes"."type" != 'percentage'),
	CONSTRAINT "promo_code_current_redemptions_non_negative" CHECK ("promo_codes"."current_redemptions" >= 0),
	CONSTRAINT "promo_code_max_redemptions_positive" CHECK ("promo_codes"."max_total_redemptions" IS NULL OR "promo_codes"."max_total_redemptions" > 0),
	CONSTRAINT "promo_code_max_redemptions_per_user_positive" CHECK ("promo_codes"."max_redemptions_per_user" > 0)
);
--> statement-breakpoint
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "promo_redemption_user_code_unique" ON "promo_code_redemptions" USING btree ("promo_code_id","user_id");--> statement-breakpoint
CREATE INDEX "promo_redemption_user_idx" ON "promo_code_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "promo_redemption_promo_code_idx" ON "promo_code_redemptions" USING btree ("promo_code_id");--> statement-breakpoint
CREATE INDEX "promo_redemption_order_idx" ON "promo_code_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "promo_redemption_redeemed_at_idx" ON "promo_code_redemptions" USING btree ("redeemed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "promo_code_upper_unique" ON "promo_codes" USING btree (UPPER("code"));--> statement-breakpoint
CREATE INDEX "promo_code_is_active_idx" ON "promo_codes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "promo_code_expires_at_idx" ON "promo_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "promo_code_created_by_idx" ON "promo_codes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "promo_code_type_idx" ON "promo_codes" USING btree ("type");--> statement-breakpoint
