CREATE TABLE "month_result" (
	"user_id" text NOT NULL,
	"month" text NOT NULL,
	"points" integer NOT NULL,
	"lines" integer NOT NULL,
	"tiers" text[] NOT NULL,
	"squares_counting" integer NOT NULL,
	"size" integer NOT NULL,
	"seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "month_result_user_id_month_pk" PRIMARY KEY("user_id","month")
);
--> statement-breakpoint
ALTER TABLE "month_result" ADD CONSTRAINT "month_result_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;