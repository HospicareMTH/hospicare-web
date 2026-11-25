CREATE TABLE "physical_admission_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"evaluation_date" date NOT NULL,
	"pain_score" smallint NOT NULL,
	"tiredness_score" smallint NOT NULL,
	"nausea_score" smallint NOT NULL,
	"depression_score" smallint NOT NULL,
	"anxiety_score" smallint NOT NULL,
	"drowsiness_score" smallint NOT NULL,
	"appetite_score" smallint NOT NULL,
	"dyspnea_score" smallint NOT NULL,
	"sleep_difficulty_score" smallint NOT NULL,
	"wellbeing_score" smallint NOT NULL,
	"heart_rate" text,
	"blood_pressure" text,
	"respiratory_rate" text,
	"temperature" text,
	"pain_cause" text,
	"pain_location" text,
	"pain_intensity" text,
	"pain_type" text,
	"ambulation_option_id" uuid,
	"ambulation_cause_option_id" uuid,
	"neurological_lesion_detail" text,
	"ecog_score_option_id" uuid,
	"bathroom_transfer_option_id" uuid,
	"swallowing_option_id" uuid,
	"nutrition_option_id" uuid,
	"hydration_option_id" uuid,
	"hydration_route_option_id" uuid,
	"abdomen_option_id" uuid,
	"diuresis_option_id" uuid,
	"urine_option_id" uuid,
	"last_catarsis_date" date,
	"respiratory_option_id" uuid,
	"expectoration_type" text,
	"has_pressure_ulcers" boolean NOT NULL,
	"pressure_ulcer_stage" text,
	"pressure_ulcer_location" text,
	"other_skin_lesions" text,
	"has_edemas" boolean NOT NULL,
	"edema_location" text,
	"has_ostomies" boolean NOT NULL,
	"ostomy_type" text,
	"other_disorders" text,
	"care_plan" text,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "physical_evaluations_pain_score_range" CHECK ("physical_admission_evaluations"."pain_score" between 0 and 10),
	CONSTRAINT "physical_evaluations_tiredness_score_range" CHECK ("physical_admission_evaluations"."tiredness_score" between 0 and 10),
	CONSTRAINT "physical_evaluations_nausea_score_range" CHECK ("physical_admission_evaluations"."nausea_score" between 0 and 10),
	CONSTRAINT "physical_evaluations_depression_score_range" CHECK ("physical_admission_evaluations"."depression_score" between 0 and 10),
	CONSTRAINT "physical_evaluations_anxiety_score_range" CHECK ("physical_admission_evaluations"."anxiety_score" between 0 and 10),
	CONSTRAINT "physical_evaluations_drowsiness_score_range" CHECK ("physical_admission_evaluations"."drowsiness_score" between 0 and 10),
	CONSTRAINT "physical_evaluations_appetite_score_range" CHECK ("physical_admission_evaluations"."appetite_score" between 0 and 10),
	CONSTRAINT "physical_evaluations_dyspnea_score_range" CHECK ("physical_admission_evaluations"."dyspnea_score" between 0 and 10),
	CONSTRAINT "physical_evaluations_sleep_difficulty_score_range" CHECK ("physical_admission_evaluations"."sleep_difficulty_score" between 0 and 10),
	CONSTRAINT "physical_evaluations_wellbeing_score_range" CHECK ("physical_admission_evaluations"."wellbeing_score" between 0 and 10),
	CONSTRAINT "physical_evaluations_heart_rate_length" CHECK (char_length("physical_admission_evaluations"."heart_rate") <= 40),
	CONSTRAINT "physical_evaluations_blood_pressure_length" CHECK (char_length("physical_admission_evaluations"."blood_pressure") <= 40),
	CONSTRAINT "physical_evaluations_respiratory_rate_length" CHECK (char_length("physical_admission_evaluations"."respiratory_rate") <= 40),
	CONSTRAINT "physical_evaluations_temperature_length" CHECK (char_length("physical_admission_evaluations"."temperature") <= 40),
	CONSTRAINT "physical_evaluations_pain_cause_length" CHECK (char_length("physical_admission_evaluations"."pain_cause") <= 200),
	CONSTRAINT "physical_evaluations_pain_location_length" CHECK (char_length("physical_admission_evaluations"."pain_location") <= 200),
	CONSTRAINT "physical_evaluations_pain_intensity_length" CHECK (char_length("physical_admission_evaluations"."pain_intensity") <= 200),
	CONSTRAINT "physical_evaluations_pain_type_length" CHECK (char_length("physical_admission_evaluations"."pain_type") <= 200),
	CONSTRAINT "physical_evaluations_neurological_lesion_detail_length" CHECK (char_length("physical_admission_evaluations"."neurological_lesion_detail") <= 200),
	CONSTRAINT "physical_evaluations_expectoration_type_length" CHECK (char_length("physical_admission_evaluations"."expectoration_type") <= 200),
	CONSTRAINT "physical_evaluations_pressure_ulcer_location_length" CHECK (char_length("physical_admission_evaluations"."pressure_ulcer_location") <= 200),
	CONSTRAINT "physical_evaluations_edema_location_length" CHECK (char_length("physical_admission_evaluations"."edema_location") <= 200),
	CONSTRAINT "physical_evaluations_ostomy_type_length" CHECK (char_length("physical_admission_evaluations"."ostomy_type") <= 200),
	CONSTRAINT "physical_evaluations_other_skin_lesions_length" CHECK (char_length("physical_admission_evaluations"."other_skin_lesions") <= 2000),
	CONSTRAINT "physical_evaluations_other_disorders_length" CHECK (char_length("physical_admission_evaluations"."other_disorders") <= 2000),
	CONSTRAINT "physical_evaluations_care_plan_length" CHECK (char_length("physical_admission_evaluations"."care_plan") <= 2000),
	CONSTRAINT "physical_evaluations_pain_dependency" CHECK ((
        "physical_admission_evaluations"."pain_score" > 0
        and "physical_admission_evaluations"."pain_cause" is not null
        and "physical_admission_evaluations"."pain_location" is not null
        and "physical_admission_evaluations"."pain_intensity" is not null
        and "physical_admission_evaluations"."pain_type" is not null
      ) or (
        "physical_admission_evaluations"."pain_score" = 0
        and "physical_admission_evaluations"."pain_cause" is null
        and "physical_admission_evaluations"."pain_location" is null
        and "physical_admission_evaluations"."pain_intensity" is null
        and "physical_admission_evaluations"."pain_type" is null
      )),
	CONSTRAINT "physical_evaluations_pressure_ulcer_dependency" CHECK ((
        "physical_admission_evaluations"."has_pressure_ulcers"
        and "physical_admission_evaluations"."pressure_ulcer_stage" in ('I', 'II', 'III', 'IV')
        and "physical_admission_evaluations"."pressure_ulcer_location" is not null
      ) or (
        not "physical_admission_evaluations"."has_pressure_ulcers"
        and "physical_admission_evaluations"."pressure_ulcer_stage" is null
        and "physical_admission_evaluations"."pressure_ulcer_location" is null
      )),
	CONSTRAINT "physical_evaluations_edema_dependency" CHECK ("physical_admission_evaluations"."has_edemas" = ("physical_admission_evaluations"."edema_location" is not null)),
	CONSTRAINT "physical_evaluations_ostomy_dependency" CHECK ("physical_admission_evaluations"."has_ostomies" = ("physical_admission_evaluations"."ostomy_type" is not null))
);
--> statement-breakpoint
CREATE TABLE "physical_evaluation_catarsis_consistency_options" (
	"guest_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "physical_evaluation_catarsis_consistency_options_pk" PRIMARY KEY("guest_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "physical_evaluation_catarsis_options" (
	"guest_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "physical_evaluation_catarsis_options_pk" PRIMARY KEY("guest_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "physical_evaluation_hygiene_options" (
	"guest_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "physical_evaluation_hygiene_options_pk" PRIMARY KEY("guest_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "physical_evaluation_mouth_options" (
	"guest_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "physical_evaluation_mouth_options_pk" PRIMARY KEY("guest_id","option_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "physical_admission_evaluations_guest_unique" ON "physical_admission_evaluations" USING btree ("guest_id");