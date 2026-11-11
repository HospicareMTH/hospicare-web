CREATE FUNCTION "audit_security_event"("action_name" text, "resource_name" text, "subject_user_id" text) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "target_user_id", "status"
  ) VALUES (
    "action_name", 'security', "resource_name", "subject_user_id",
    COALESCE("audit_actor_user_id"(), "audit_existing_user_id"("subject_user_id")),
    "audit_existing_user_id"("subject_user_id"), 'success'
  )
$$;
--> statement-breakpoint
CREATE FUNCTION "audit_user_security_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."email_verified" AND NOT OLD."email_verified" THEN
    PERFORM "audit_security_event"('user.email_verified', 'user', NEW."id");
  END IF;
  IF NEW."two_factor_enabled" IS DISTINCT FROM OLD."two_factor_enabled" THEN
    PERFORM "audit_security_event"(
      CASE WHEN NEW."two_factor_enabled" THEN 'user.two_factor_enabled' ELSE 'user.two_factor_disabled' END,
      'user', NEW."id"
    );
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "users_security_audit" AFTER UPDATE OF "email_verified", "two_factor_enabled" ON "users"
FOR EACH ROW EXECUTE FUNCTION "audit_user_security_change"();
--> statement-breakpoint
CREATE TRIGGER "two_factors_audit" AFTER INSERT OR UPDATE OR DELETE ON "two_factors"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('two_factor', 'id', 'user_id', 'secret', 'backup_codes');
--> statement-breakpoint
CREATE FUNCTION "audit_backup_codes_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "audit_security_event"('two_factor.backup_codes_updated', 'two_factor', NEW."user_id");
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "two_factors_backup_codes_audit" AFTER UPDATE OF "backup_codes" ON "two_factors"
FOR EACH ROW WHEN (OLD."backup_codes" IS DISTINCT FROM NEW."backup_codes")
EXECUTE FUNCTION "audit_backup_codes_change"();
