CREATE TABLE "auth_attempt" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auth_attempt_key_created_at_idx" ON "auth_attempt" USING btree ("key","created_at");