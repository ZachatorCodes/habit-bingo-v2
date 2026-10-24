CREATE TABLE "feed_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"card_id" text NOT NULL,
	"type" text NOT NULL,
	"key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_event_card_id_key_unique" UNIQUE("card_id","key"),
	CONSTRAINT "feed_event_type_check" CHECK ("feed_event"."type" in ('cardStarted', 'squareComplete', 'bingo', 'sixtyPercent', 'blackout'))
);
--> statement-breakpoint
CREATE TABLE "reaction" (
	"feed_event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"icon" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reaction_feed_event_id_user_id_pk" PRIMARY KEY("feed_event_id","user_id"),
	CONSTRAINT "reaction_icon_check" CHECK ("reaction"."icon" in ('heart', 'fire', 'hands-clapping', 'trophy', 'star', 'smiley'))
);
--> statement-breakpoint
ALTER TABLE "feed_event" ADD CONSTRAINT "feed_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_event" ADD CONSTRAINT "feed_event_card_id_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_feed_event_id_feed_event_id_fk" FOREIGN KEY ("feed_event_id") REFERENCES "public"."feed_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_event_user_id_created_at_idx" ON "feed_event" USING btree ("user_id","created_at" DESC NULLS LAST);