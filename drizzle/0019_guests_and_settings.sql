CREATE TABLE "guest_hospitalization_reasons" (
	"guest_id" uuid NOT NULL,
	"hospitalization_reason_option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_hospitalization_reasons_pk" PRIMARY KEY("guest_id","hospitalization_reason_option_id")
);
--> statement-breakpoint
CREATE TABLE "guest_uncontrolled_symptoms" (
	"guest_id" uuid NOT NULL,
	"uncontrolled_symptom_option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_uncontrolled_symptoms_pk" PRIMARY KEY("guest_id","uncontrolled_symptom_option_id")
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinical_record_number" integer NOT NULL,
	"hospitalization_date" date NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"birth_date" date NOT NULL,
	"dni" text NOT NULL,
	"address" text NOT NULL,
	"health_insurance_option_id" uuid,
	"health_insurance_member_number" text,
	"other_hospitalization_reason" text,
	"origin" text NOT NULL,
	"admission_interview_id" uuid,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"annulled_at" timestamp with time zone,
	"annulled_by_user_id" text,
	"annulment_reason" text,
	CONSTRAINT "guests_clinical_record_number_positive" CHECK ("guests"."clinical_record_number" > 0),
	CONSTRAINT "guests_dni_format" CHECK ("guests"."dni" ~ '^[1-9][0-9]{6,7}$'),
	CONSTRAINT "guests_origin_values" CHECK ("guests"."origin" in ('admission', 'manual')),
	CONSTRAINT "guests_origin_interview_dependency" CHECK (("guests"."origin" = 'admission') = ("guests"."admission_interview_id" is not null)),
	CONSTRAINT "guests_annulment_completeness" CHECK (("guests"."annulled_at" is null) = ("guests"."annulment_reason" is null))
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by_user_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_values" CHECK ("system_settings"."key" in ('last_clinical_record_number')),
	CONSTRAINT "system_settings_last_clinical_record_number_format" CHECK ("system_settings"."key" <> 'last_clinical_record_number' or (jsonb_typeof("system_settings"."value") = 'number' and ("system_settings"."value" #>> '{}') ~ '^[0-9]+$'))
);
--> statement-breakpoint
ALTER TABLE "guest_hospitalization_reasons" ADD CONSTRAINT "guest_hospitalization_reasons_guest_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_uncontrolled_symptoms" ADD CONSTRAINT "guest_uncontrolled_symptoms_guest_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guests_clinical_record_number_unique" ON "guests" USING btree ("clinical_record_number");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_admission_interview_unique" ON "guests" USING btree ("admission_interview_id") WHERE "guests"."annulled_at" is null;