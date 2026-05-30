CREATE TYPE "public"."entry_category" AS ENUM('Business', 'Health', 'Mind', 'Execution', 'Life');--> statement-breakpoint
CREATE TYPE "public"."entry_type" AS ENUM('TURN', 'PULSE', 'MIRROR', 'FORGE', 'TRACE');--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "entry_type",
	"category" "entry_category",
	"text" text NOT NULL,
	"classified_at" timestamp with time zone,
	"type_confidence_pct" bigint,
	"type_locked" boolean DEFAULT false NOT NULL,
	"outcome" text,
	"outcome_success" boolean,
	"outcome_notes" text,
	"outcome_at" timestamp with time zone,
	"executes_entry_id" uuid,
	"decision_latency_ms" bigint,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_executes_entry_id_entries_id_fk" FOREIGN KEY ("executes_entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_created_at_idx" ON "entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "entries_type_idx" ON "entries" USING btree ("type");--> statement-breakpoint
CREATE INDEX "entries_category_idx" ON "entries" USING btree ("category");--> statement-breakpoint
CREATE INDEX "entries_executes_entry_id_idx" ON "entries" USING btree ("executes_entry_id");