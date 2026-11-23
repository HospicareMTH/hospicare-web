ALTER TABLE "guests" ADD CONSTRAINT "guests_health_insurance_fk" FOREIGN KEY ("health_insurance_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_admission_interview_fk" FOREIGN KEY ("admission_interview_id") REFERENCES "public"."admission_interviews"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_created_by_user_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_updated_by_user_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_annulled_by_user_fk" FOREIGN KEY ("annulled_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "guest_hospitalization_reasons" ADD CONSTRAINT "guest_hospitalization_reasons_option_fk" FOREIGN KEY ("hospitalization_reason_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "guest_uncontrolled_symptoms" ADD CONSTRAINT "guest_uncontrolled_symptoms_option_fk" FOREIGN KEY ("uncontrolled_symptom_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_user_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "system_settings" ("key", "value") VALUES ('last_clinical_record_number', '0');
--> statement-breakpoint
CREATE FUNCTION "audit_guest_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  "previous_row" jsonb;
  "next_row" jsonb := to_jsonb(NEW);
  "action_name" text := 'guest.updated';
  "operation_name" "audit_operation" := 'update';
BEGIN
  IF TG_OP = 'INSERT' THEN
    "action_name" := CASE NEW."origin"
      WHEN 'admission' THEN 'guest.created_from_admission'
      ELSE 'guest.created_manually'
    END;
    "operation_name" := 'create';
  ELSE
    "previous_row" := to_jsonb(OLD);
    IF "previous_row" = "next_row" THEN
      RETURN NULL;
    END IF;
    IF OLD."annulled_at" IS NULL AND NEW."annulled_at" IS NOT NULL THEN
      "action_name" := 'guest.annulled';
      "operation_name" := 'delete';
    END IF;
  END IF;

  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "status", "previous_value", "new_value"
  ) VALUES (
    "action_name", "operation_name", 'guest', NEW."id"::text,
    "audit_actor_user_id"(), 'success', "previous_row", "next_row"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "guests_audit" AFTER INSERT OR UPDATE ON "guests"
FOR EACH ROW EXECUTE FUNCTION "audit_guest_change"();
--> statement-breakpoint
CREATE TRIGGER "guest_hospitalization_reasons_audit" AFTER INSERT OR UPDATE OR DELETE ON "guest_hospitalization_reasons"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('guest_hospitalization_reason', 'guest_id', '');
--> statement-breakpoint
CREATE TRIGGER "guest_uncontrolled_symptoms_audit" AFTER INSERT OR UPDATE OR DELETE ON "guest_uncontrolled_symptoms"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('guest_uncontrolled_symptom', 'guest_id', '');
--> statement-breakpoint
CREATE FUNCTION "audit_system_setting_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  "previous_row" jsonb := to_jsonb(OLD);
  "next_row" jsonb := to_jsonb(NEW);
BEGIN
  IF "previous_row" = "next_row" THEN
    RETURN NULL;
  END IF;
  -- El número que toma un huésped nuevo ya consta en la entrada de ese huésped.
  IF current_setting('hospicare.audit_context', true) = 'clinical_record_number_assignment' THEN
    RETURN NULL;
  END IF;

  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "status", "previous_value", "new_value"
  ) VALUES (
    'system_setting.updated', 'update', 'system_setting', NEW."key",
    "audit_actor_user_id"(), 'success', "previous_row", "next_row"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "system_settings_audit" AFTER UPDATE ON "system_settings"
FOR EACH ROW EXECUTE FUNCTION "audit_system_setting_change"();
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hospicare_app') THEN
    REVOKE DELETE, TRUNCATE ON "guests" FROM hospicare_app;
    REVOKE DELETE, TRUNCATE ON "system_settings" FROM hospicare_app;
    REVOKE TRUNCATE ON "guest_hospitalization_reasons" FROM hospicare_app;
    REVOKE TRUNCATE ON "guest_uncontrolled_symptoms" FROM hospicare_app;
  END IF;
END;
$$;
