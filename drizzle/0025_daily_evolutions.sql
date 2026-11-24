CREATE TABLE "daily_evolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"author_user_id" text,
	"signature" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"editable_until" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "daily_evolutions_text_length" CHECK (char_length("daily_evolutions"."text") between 10 and 5000),
	CONSTRAINT "daily_evolutions_signature_present" CHECK (char_length("daily_evolutions"."signature") > 0),
	CONSTRAINT "daily_evolutions_editable_until_after_creation" CHECK ("daily_evolutions"."editable_until" >= "daily_evolutions"."created_at")
);
--> statement-breakpoint
ALTER TABLE "system_settings" DROP CONSTRAINT "system_settings_key_values";--> statement-breakpoint
CREATE INDEX "daily_evolutions_guest_created_at_index" ON "daily_evolutions" USING btree ("guest_id","created_at");--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_daily_evolution_edit_window_format" CHECK ("system_settings"."key" <> 'daily_evolution_edit_window' or "system_settings"."value" = '{"mode": "immediate"}'::jsonb or (
        "system_settings"."value" ->> 'mode' = 'duration'
        and ("system_settings"."value" - 'mode' - 'amount' - 'unit') = '{}'::jsonb
        and jsonb_typeof("system_settings"."value" -> 'amount') = 'number'
        and ("system_settings"."value" ->> 'amount') ~ '^[1-9][0-9]*$'
        and (
          ("system_settings"."value" ->> 'unit' = 'minutes' and ("system_settings"."value" ->> 'amount')::numeric <= 43200)
          or ("system_settings"."value" ->> 'unit' = 'hours' and ("system_settings"."value" ->> 'amount')::numeric <= 720)
          or ("system_settings"."value" ->> 'unit' = 'days' and ("system_settings"."value" ->> 'amount')::numeric <= 30)
        )
      ));--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_key_values" CHECK ("system_settings"."key" in ('last_clinical_record_number', 'daily_evolution_edit_window'));