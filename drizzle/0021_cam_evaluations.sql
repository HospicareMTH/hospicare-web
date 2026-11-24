CREATE TABLE "cam_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"evaluation_date" date NOT NULL,
	"acute_onset" boolean NOT NULL,
	"inattention" boolean,
	"disorganized_thinking" boolean,
	"altered_consciousness" boolean,
	"is_delirium_likely" boolean NOT NULL,
	"stopped_at_criterion" text,
	"observations" text,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cam_evaluations_observations_length" CHECK (char_length("cam_evaluations"."observations") <= 100),
	CONSTRAINT "cam_evaluations_criteria_consistency" CHECK ((
        not "cam_evaluations"."acute_onset"
        and "cam_evaluations"."inattention" is null
        and "cam_evaluations"."disorganized_thinking" is null
        and "cam_evaluations"."altered_consciousness" is null
        and "cam_evaluations"."stopped_at_criterion" = 'acute_onset'
        and not "cam_evaluations"."is_delirium_likely"
      ) or (
        "cam_evaluations"."acute_onset"
        and "cam_evaluations"."inattention" = false
        and "cam_evaluations"."disorganized_thinking" is null
        and "cam_evaluations"."altered_consciousness" is null
        and "cam_evaluations"."stopped_at_criterion" = 'inattention'
        and not "cam_evaluations"."is_delirium_likely"
      ) or (
        "cam_evaluations"."acute_onset"
        and "cam_evaluations"."inattention"
        and "cam_evaluations"."disorganized_thinking" is not null
        and "cam_evaluations"."altered_consciousness" is not null
        and "cam_evaluations"."stopped_at_criterion" is null
        and "cam_evaluations"."is_delirium_likely" = ("cam_evaluations"."disorganized_thinking" or "cam_evaluations"."altered_consciousness")
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cam_evaluations_guest_unique" ON "cam_evaluations" USING btree ("guest_id");