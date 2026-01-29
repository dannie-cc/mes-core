-- 1. Create roles first
CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" varchar(255),
  "is_default" boolean DEFAULT false,
  "is_admin" boolean DEFAULT false,
  "_created" timestamp with time zone DEFAULT now() NOT NULL,
  "_updated" timestamp with time zone DEFAULT now() NOT NULL,
  "_deleted" timestamp with time zone,
  CONSTRAINT "roles_name_unique" UNIQUE("name")
);

--> statement-breakpoint

-- 2. Insert Authenticated role for backfill
INSERT INTO "roles" (id, name, description, is_admin, is_default)
VALUES (gen_random_uuid(), 'Authenticated', 'Default role for existing users', false, true)
ON CONFLICT (name) DO NOTHING;

--> statement-breakpoint

-- 3. Create permissions
CREATE TABLE "permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" varchar(255) NOT NULL,
  "_created" timestamp with time zone DEFAULT now() NOT NULL,
  "_updated" timestamp with time zone DEFAULT now() NOT NULL,
  "_deleted" timestamp with time zone,
  CONSTRAINT "permissions_name_unique" UNIQUE("name")
);

--> statement-breakpoint

-- 4. Create role_permissions
CREATE TABLE "role_permissions" (
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  CONSTRAINT "role_permissions_role_id_permission_id_pk"
    PRIMARY KEY("role_id","permission_id")
);

--> statement-breakpoint

-- 5a. Add column as nullable
ALTER TABLE "users"
  ADD COLUMN "role_id" uuid;

--> statement-breakpoint

-- 5b. Backfill existing users
UPDATE "users"
SET role_id = (SELECT id FROM "roles" WHERE name = 'Authenticated')
WHERE role_id IS NULL;

--> statement-breakpoint

-- 5c. Set NOT NULL
ALTER TABLE "users"
  ALTER COLUMN "role_id" SET NOT NULL;

--> statement-breakpoint

-- 6a. Foreign key for role_permissions → roles
ALTER TABLE "role_permissions"
  ADD CONSTRAINT "role_permissions_role_id_roles_id_fk"
  FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id")
  ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint

-- 6b. Foreign key for role_permissions → permissions
ALTER TABLE "role_permissions"
  ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk"
  FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id")
  ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint

-- 6c. Foreign key for users.role_id → roles.id
ALTER TABLE "users"
  ADD CONSTRAINT "users_role_id_roles_id_fk"
  FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id")
  ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint

-- 7. Indexes
CREATE INDEX "permission_name_idx" ON "permissions" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "permission_date_idx" ON "permissions" USING btree ("_created");
--> statement-breakpoint
CREATE INDEX "rp_role_idx" ON "role_permissions" USING btree ("role_id");
--> statement-breakpoint
CREATE INDEX "rp_permission_idx" ON "role_permissions" USING btree ("permission_id");
--> statement-breakpoint
CREATE INDEX "role_name_idx" ON "roles" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "role_date_idx" ON "roles" USING btree ("_created");
--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "users" USING btree ("role_id");
