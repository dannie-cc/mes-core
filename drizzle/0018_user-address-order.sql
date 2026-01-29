ALTER TABLE "orders"
ADD COLUMN "shipping_address_id" uuid;

--> statement-breakpoint
UPDATE "orders" o
SET
    "shipping_address_id" = ua.id
FROM
    "user_addresses" ua
WHERE
    ua.user_id = o.user_id
    --> statement-breakpoint
ALTER TABLE "orders"
ALTER COLUMN "shipping_address_id"
SET
    NOT NULL;

ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_user_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."user_addresses" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "orders"
DROP COLUMN "shipping_address";
