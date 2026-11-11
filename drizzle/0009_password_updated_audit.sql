DROP TRIGGER "accounts_password_reset_audit" ON "accounts";
--> statement-breakpoint
DROP FUNCTION "audit_password_reset"();
--> statement-breakpoint
CREATE FUNCTION "audit_password_update"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "audit_security_event"('user.password_updated', 'user', NEW."user_id");
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "accounts_password_audit" AFTER UPDATE OF "password" ON "accounts"
FOR EACH ROW WHEN (OLD."password" IS DISTINCT FROM NEW."password")
EXECUTE FUNCTION "audit_password_update"();
