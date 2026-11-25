CREATE TABLE "daily_evolution_clarifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_evolution_id" uuid NOT NULL,
	"author_user_id" text,
	"signature" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "daily_evolution_clarifications_text_length" CHECK (char_length("daily_evolution_clarifications"."text") between 10 and 5000),
	CONSTRAINT "daily_evolution_clarifications_signature_present" CHECK (char_length("daily_evolution_clarifications"."signature") > 0)
);
--> statement-breakpoint
ALTER TABLE "daily_evolutions" ADD COLUMN "annulled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_evolutions" ADD COLUMN "annulment_reason" text;--> statement-breakpoint
CREATE INDEX "daily_evolution_clarifications_evolution_index" ON "daily_evolution_clarifications" USING btree ("daily_evolution_id","created_at");--> statement-breakpoint
ALTER TABLE "daily_evolutions" ADD CONSTRAINT "daily_evolutions_annulment_completeness" CHECK (("daily_evolutions"."annulled_at" is null) = ("daily_evolutions"."annulment_reason" is null));--> statement-breakpoint
ALTER TABLE "daily_evolutions" ADD CONSTRAINT "daily_evolutions_annulment_reason_length" CHECK (char_length("daily_evolutions"."annulment_reason") between 10 and 500);