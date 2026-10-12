CREATE TABLE "habit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"direction" text NOT NULL,
	"period" text NOT NULL,
	"count_mode" text NOT NULL,
	"target" integer NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habit_direction_check" CHECK ("habit"."direction" in ('atLeast', 'atMost')),
	CONSTRAINT "habit_period_check" CHECK ("habit"."period" in ('day', 'week', 'month')),
	CONSTRAINT "habit_count_mode_check" CHECK ("habit"."count_mode" in ('times', 'days')),
	CONSTRAINT "habit_category_check" CHECK ("habit"."category" in ('fitness', 'health', 'mind', 'home', 'social', 'learning', 'creative', 'money', 'other'))
);
--> statement-breakpoint
ALTER TABLE "habit" ADD CONSTRAINT "habit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "habit_user_id_archived_at_idx" ON "habit" USING btree ("user_id","archived_at");