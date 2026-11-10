CREATE FUNCTION "audit_password_reset"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "target_user_id", "status"
  ) VALUES (
    'user.password_reset', 'security', 'user', NEW."user_id",
    COALESCE("audit_actor_user_id"(), "audit_existing_user_id"(NEW."user_id")),
    "audit_existing_user_id"(NEW."user_id"), 'success'
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "accounts_password_reset_audit" AFTER UPDATE OF "password" ON "accounts"
FOR EACH ROW WHEN (OLD."password" IS DISTINCT FROM NEW."password")
EXECUTE FUNCTION "audit_password_reset"();
