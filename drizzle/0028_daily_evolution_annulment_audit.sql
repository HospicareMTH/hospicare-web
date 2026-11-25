ALTER TABLE "daily_evolution_clarifications" ADD CONSTRAINT "daily_evolution_clarifications_evolution_fk" FOREIGN KEY ("daily_evolution_id") REFERENCES "public"."daily_evolutions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "daily_evolution_clarifications" ADD CONSTRAINT "daily_evolution_clarifications_author_user_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
DROP TRIGGER "daily_evolutions_audit" ON "daily_evolutions";
--> statement-breakpoint
CREATE FUNCTION "audit_daily_evolution_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  "previous_row" jsonb;
  "next_row" jsonb := to_jsonb(NEW);
  "action_name" text := 'daily_evolution.updated';
  "operation_name" "audit_operation" := 'update';
BEGIN
  IF TG_OP = 'INSERT' THEN
    "action_name" := 'daily_evolution.created';
    "operation_name" := 'create';
  ELSE
    "previous_row" := to_jsonb(OLD);
    IF "previous_row" = "next_row" THEN
      RETURN NULL;
    END IF;
    IF OLD."annulled_at" IS NULL AND NEW."annulled_at" IS NOT NULL THEN
      "action_name" := 'daily_evolution.annulled';
      "operation_name" := 'delete';
    END IF;
  END IF;

  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "status", "previous_value", "new_value"
  ) VALUES (
    "action_name", "operation_name", 'daily_evolution', NEW."id"::text,
    "audit_actor_user_id"(), 'success', "previous_row", "next_row"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "daily_evolutions_audit" AFTER INSERT OR UPDATE ON "daily_evolutions"
FOR EACH ROW EXECUTE FUNCTION "audit_daily_evolution_change"();
--> statement-breakpoint
CREATE TRIGGER "daily_evolution_clarifications_audit" AFTER INSERT ON "daily_evolution_clarifications"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('daily_evolution_clarification', 'id', '');
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hospicare_app') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON "daily_evolution_clarifications" FROM hospicare_app;
  END IF;
END;
$$;
