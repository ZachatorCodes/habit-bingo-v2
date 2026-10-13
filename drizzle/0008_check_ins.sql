CREATE TABLE "check_in" (
	"id" text PRIMARY KEY NOT NULL,
	"square_id" text NOT NULL,
	"date" text NOT NULL,
	"count" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_in_square_id_date_unique" UNIQUE("square_id","date"),
	CONSTRAINT "check_in_count_check" CHECK ("check_in"."count" between 1 and 20)
);
--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_square_id_card_square_id_fk" FOREIGN KEY ("square_id") REFERENCES "public"."card_square"("id") ON DELETE cascade ON UPDATE no action;