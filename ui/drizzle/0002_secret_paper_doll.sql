CREATE TABLE "users" (
	"author" "author" PRIMARY KEY NOT NULL,
	"passcode_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
