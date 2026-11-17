ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_health_insurance_fk" FOREIGN KEY ("health_insurance_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_information_awareness_fk" FOREIGN KEY ("information_awareness_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_religion_fk" FOREIGN KEY ("religion_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_ecog_score_fk" FOREIGN KEY ("ecog_score_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_interviewee_relationship_fk" FOREIGN KEY ("interviewee_relationship_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_metastasis_location_fk" FOREIGN KEY ("metastasis_location_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_oncological_treatment_fk" FOREIGN KEY ("oncological_treatment_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_primary_doctor_fk" FOREIGN KEY ("primary_doctor_id") REFERENCES "public"."healthcare_professionals"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_created_by_user_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_updated_by_user_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_interviews" ADD CONSTRAINT "admission_interviews_annulled_by_user_fk" FOREIGN KEY ("annulled_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admission_interview_surgeries" ADD CONSTRAINT "admission_interview_surgeries_surgery_option_fk" FOREIGN KEY ("surgery_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
UPDATE "catalog_options" SET "system_key" = 'religion_other'
WHERE "catalog" = 'religion' AND "is_system" AND "label" = 'Otra';
--> statement-breakpoint
CREATE FUNCTION "audit_admission_interview_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  "previous_row" jsonb;
  "next_row" jsonb := to_jsonb(NEW);
  "action_name" text := 'admission_interview.updated';
  "operation_name" "audit_operation" := 'update';
BEGIN
  IF TG_OP = 'INSERT' THEN
    "action_name" := 'admission_interview.created';
    "operation_name" := 'create';
  ELSE
    "previous_row" := to_jsonb(OLD);
    IF "previous_row" = "next_row" THEN
      RETURN NULL;
    END IF;
    IF OLD."annulled_at" IS NULL AND NEW."annulled_at" IS NOT NULL THEN
      "action_name" := 'admission_interview.annulled';
      "operation_name" := 'delete';
    END IF;
  END IF;

  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "status", "previous_value", "new_value"
  ) VALUES (
    "action_name", "operation_name", 'admission_interview', NEW."id"::text,
    "audit_actor_user_id"(), 'success', "previous_row", "next_row"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "admission_interviews_audit" AFTER INSERT OR UPDATE ON "admission_interviews"
FOR EACH ROW EXECUTE FUNCTION "audit_admission_interview_change"();
--> statement-breakpoint
CREATE TRIGGER "admission_interview_surgeries_audit" AFTER INSERT OR UPDATE OR DELETE ON "admission_interview_surgeries"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('admission_interview_surgery', 'admission_interview_id', '');
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hospicare_app') THEN
    REVOKE DELETE, TRUNCATE ON "admission_interviews" FROM hospicare_app;
    REVOKE TRUNCATE ON "admission_interview_surgeries" FROM hospicare_app;
  END IF;
END;
$$;
