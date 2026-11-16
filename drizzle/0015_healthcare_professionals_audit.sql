ALTER TABLE "healthcare_professionals" ADD CONSTRAINT "healthcare_professionals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "healthcare_professionals" ADD CONSTRAINT "healthcare_professionals_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
CREATE FUNCTION "audit_healthcare_professional_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  "previous_row" jsonb;
  "next_row" jsonb := to_jsonb(NEW);
  "action_name" text;
  "operation_name" "audit_operation";
BEGIN
  IF TG_OP = 'INSERT' THEN
    "action_name" := 'healthcare_professional.created';
    "operation_name" := 'create';
  ELSE
    "previous_row" := to_jsonb(OLD);
    IF "previous_row" = "next_row" THEN
      RETURN NULL;
    END IF;
    "operation_name" := 'update';
    IF OLD."is_active" AND NOT NEW."is_active" THEN
      "action_name" := 'healthcare_professional.deactivated';
      "operation_name" := 'delete';
    ELSIF NOT OLD."is_active" AND NEW."is_active" THEN
      "action_name" := 'healthcare_professional.reactivated';
    ELSE
      "action_name" := 'healthcare_professional.updated';
    END IF;
  END IF;

  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "status", "previous_value", "new_value"
  ) VALUES (
    "action_name", "operation_name", 'healthcare_professional', NEW."id"::text,
    "audit_actor_user_id"(), 'success', "previous_row", "next_row"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "healthcare_professionals_audit" AFTER INSERT OR UPDATE ON "healthcare_professionals"
FOR EACH ROW EXECUTE FUNCTION "audit_healthcare_professional_change"();
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hospicare_app') THEN
    REVOKE DELETE, TRUNCATE ON "healthcare_professionals" FROM hospicare_app;
  END IF;
END;
$$;
