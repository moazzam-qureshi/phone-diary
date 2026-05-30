CREATE TYPE "public"."author" AS ENUM('author_a', 'author_b');--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "author" "author";--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "is_secret" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "gifted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "entries_author_idx" ON "entries" USING btree ("author");