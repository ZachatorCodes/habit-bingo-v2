-- Drafts become one per person per month (M3.1): the old primary key was user_id alone.
ALTER TABLE "card_draft" DROP CONSTRAINT "card_draft_pkey";--> statement-breakpoint
ALTER TABLE "card_draft" ADD CONSTRAINT "card_draft_user_id_month_pk" PRIMARY KEY("user_id","month");
