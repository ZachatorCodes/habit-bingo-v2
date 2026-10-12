ALTER TABLE "password_reset" DROP CONSTRAINT "password_reset_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "password_reset" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "password_reset" ADD CONSTRAINT "password_reset_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;