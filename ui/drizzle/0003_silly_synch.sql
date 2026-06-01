CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"author" "author" NOT NULL,
	"emoji" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_entry_author_idx" ON "reactions" USING btree ("entry_id","author");--> statement-breakpoint
CREATE INDEX "reactions_entry_id_idx" ON "reactions" USING btree ("entry_id");