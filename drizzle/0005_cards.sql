CREATE TABLE "card" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"month" text NOT NULL,
	"size" integer NOT NULL,
	"start_date" text NOT NULL,
	"editable_until" timestamp with time zone NOT NULL,
	"week_starts_on" text NOT NULL,
	"reward_bingo" text NOT NULL,
	"reward_sixty" text NOT NULL,
	"reward_blackout" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_user_id_month_unique" UNIQUE("user_id","month"),
	CONSTRAINT "card_size_check" CHECK ("card"."size" in (3, 5)),
	CONSTRAINT "card_week_starts_on_check" CHECK ("card"."week_starts_on" in ('monday', 'sunday'))
);
--> statement-breakpoint
CREATE TABLE "card_draft" (
	"user_id" text PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_square" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"position" integer NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"habit_id" text,
	"emoji" text,
	"name" text,
	"category" text,
	"direction" text,
	"period" text,
	"count_mode" text,
	"target" integer,
	"is_private" boolean,
	CONSTRAINT "card_square_card_id_position_unique" UNIQUE("card_id","position"),
	CONSTRAINT "card_square_snapshot_check" CHECK ("card_square"."is_free" or ("card_square"."emoji" is not null and "card_square"."name" is not null and "card_square"."category" is not null and "card_square"."direction" is not null and "card_square"."period" is not null and "card_square"."count_mode" is not null and "card_square"."target" is not null and "card_square"."is_private" is not null))
);
--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_draft" ADD CONSTRAINT "card_draft_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_square" ADD CONSTRAINT "card_square_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_square" ADD CONSTRAINT "card_square_habit_id_habit_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habit"("id") ON DELETE set null ON UPDATE no action;