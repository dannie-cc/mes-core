-- Custom SQL migration file, put your code below! --
DROP TYPE IF EXISTS "public"."stage_status_enum";
DROP TYPE IF EXISTS "public"."workflow_complexity_enum"; 
DROP TYPE IF EXISTS "public"."workflow_priority_enum"; 
DROP TYPE IF EXISTS "public"."workflow_type_enum"; 

CREATE TYPE "public"."stage_status_enum" AS ENUM('not_started', 'in_progress', 'skipped', 'on_hold', 'completed');--> statement-breakpoint
CREATE TYPE "public"."workflow_complexity_enum" AS ENUM('simple', 'medium', 'complex');--> statement-breakpoint
CREATE TYPE "public"."workflow_priority_enum" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."workflow_type_enum" AS ENUM('pcb', 'pcba');--> statement-breakpoint
