DROP INDEX "tags_kitchen_name_idx";--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_kitchen_slug_idx" ON "tags" USING btree ("kitchen_id","slug");