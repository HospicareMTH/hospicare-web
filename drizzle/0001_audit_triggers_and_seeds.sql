INSERT INTO "roles" ("system_key", "name") VALUES ('super_user', 'Super user'), ('user', 'Usuario');
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
CREATE FUNCTION "audit_existing_user_id"("candidate_user_id" text) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT "id" FROM "users" WHERE "id" = "candidate_user_id"
$$;
--> statement-breakpoint
CREATE FUNCTION "audit_actor_user_id"() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT "audit_existing_user_id"(NULLIF(current_setting('hospicare.actor_user_id', true), ''))
$$;
--> statement-breakpoint
CREATE FUNCTION "audit_session_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "audit_log" (
      "action", "operation", "resource", "resource_id", "actor_user_id",
      "target_user_id", "status", "ip_address", "user_agent"
    ) VALUES (
      'session.started', 'session', 'session', NEW."id", NEW."user_id",
      NEW."user_id", 'success', NEW."ip_address", NEW."user_agent"
    );
    RETURN NULL;
  END IF;

  IF OLD."expires_at" <= now() THEN
    RETURN NULL;
  END IF;

  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "target_user_id", "status"
  ) VALUES (
    'session.revoked', 'session', 'session', OLD."id",
    COALESCE("audit_actor_user_id"(), "audit_existing_user_id"(OLD."user_id")),
    "audit_existing_user_id"(OLD."user_id"), 'success'
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "audit_row_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  "resource_name" text := TG_ARGV[0];
  "identifier_column" text := TG_ARGV[1];
  "target_user_column" text := NULLIF(TG_ARGV[2], '');
  "hidden_columns" text[] := TG_ARGV[3:];
  "previous_row" jsonb;
  "next_row" jsonb;
  "changed_row" jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    "previous_row" := to_jsonb(OLD) - "hidden_columns";
  END IF;
  IF TG_OP <> 'DELETE' THEN
    "next_row" := to_jsonb(NEW) - "hidden_columns";
  END IF;
  IF TG_OP = 'UPDATE' AND "previous_row" = "next_row" THEN
    RETURN NULL;
  END IF;

  "changed_row" := COALESCE("next_row", "previous_row");

  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "target_user_id", "status", "previous_value", "new_value"
  ) VALUES (
    "resource_name" || CASE TG_OP WHEN 'INSERT' THEN '.created' WHEN 'UPDATE' THEN '.updated' ELSE '.deleted' END,
    (CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' ELSE 'delete' END)::"audit_operation",
    "resource_name",
    "changed_row" ->> "identifier_column",
    "audit_actor_user_id"(),
    "audit_existing_user_id"("changed_row" ->> "target_user_column"),
    'success',
    "previous_row",
    "next_row"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "sessions_audit" AFTER INSERT OR DELETE ON "sessions"
FOR EACH ROW EXECUTE FUNCTION "audit_session_change"();
--> statement-breakpoint
CREATE TRIGGER "users_audit" AFTER INSERT OR UPDATE OR DELETE ON "users"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('user', 'id', 'id');
--> statement-breakpoint
CREATE TRIGGER "accounts_audit" AFTER INSERT OR UPDATE OR DELETE ON "accounts"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('account', 'id', 'user_id', 'password', 'access_token', 'refresh_token', 'id_token');
--> statement-breakpoint
CREATE TRIGGER "roles_audit" AFTER INSERT OR UPDATE OR DELETE ON "roles"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('role', 'id', '');
--> statement-breakpoint
CREATE TRIGGER "user_roles_audit" AFTER INSERT OR UPDATE OR DELETE ON "user_roles"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('user_role', 'user_id', 'user_id');
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hospicare_app') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON "audit_log" FROM hospicare_app;
  END IF;
END;
$$;
