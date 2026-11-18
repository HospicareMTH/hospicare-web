CREATE FUNCTION "audit_user_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  "previous_row" jsonb;
  "next_row" jsonb;
  "changed_row" jsonb;
  "action_name" text := 'user.updated';
  "operation_name" "audit_operation" := 'update';
BEGIN
  IF TG_OP = 'INSERT' THEN
    "next_row" := to_jsonb(NEW);
    "action_name" := 'user.created';
    "operation_name" := 'create';
  ELSIF TG_OP = 'DELETE' THEN
    "previous_row" := to_jsonb(OLD);
    "action_name" := 'user.deleted';
    "operation_name" := 'delete';
  ELSE
    "previous_row" := to_jsonb(OLD);
    "next_row" := to_jsonb(NEW);
    IF "previous_row" = "next_row" THEN
      RETURN NULL;
    END IF;
    IF OLD."access_revoked_at" IS DISTINCT FROM NEW."access_revoked_at" THEN
      "action_name" := CASE WHEN NEW."access_revoked_at" IS NULL THEN 'user.access_restored' ELSE 'user.access_revoked' END;
      "operation_name" := 'security';
    END IF;
  END IF;

  "changed_row" := COALESCE("next_row", "previous_row");
  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "target_user_id", "status", "previous_value", "new_value"
  ) VALUES (
    "action_name", "operation_name", 'user', "changed_row" ->> 'id',
    "audit_actor_user_id"(), "audit_existing_user_id"("changed_row" ->> 'id'),
    'success', "previous_row", "next_row"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
DROP TRIGGER "users_audit" ON "users";
--> statement-breakpoint
CREATE TRIGGER "users_audit" AFTER INSERT OR UPDATE OR DELETE ON "users"
FOR EACH ROW EXECUTE FUNCTION "audit_user_change"();
--> statement-breakpoint
CREATE FUNCTION "audit_user_role_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  "previous_row" jsonb;
  "next_row" jsonb;
  "changed_row" jsonb;
  "action_name" text := 'user.role_updated';
  "operation_name" "audit_operation" := 'update';
  "resource_name" text := 'user';
BEGIN
  IF TG_OP = 'INSERT' THEN
    "next_row" := to_jsonb(NEW);
    "action_name" := 'user_role.created';
    "operation_name" := 'create';
    "resource_name" := 'user_role';
  ELSIF TG_OP = 'DELETE' THEN
    "previous_row" := to_jsonb(OLD);
    "action_name" := 'user_role.deleted';
    "operation_name" := 'delete';
    "resource_name" := 'user_role';
  ELSE
    "previous_row" := to_jsonb(OLD);
    "next_row" := to_jsonb(NEW);
    IF "previous_row" = "next_row" THEN
      RETURN NULL;
    END IF;
  END IF;

  "changed_row" := COALESCE("next_row", "previous_row");
  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "target_user_id", "status", "previous_value", "new_value"
  ) VALUES (
    "action_name", "operation_name", "resource_name", "changed_row" ->> 'user_id',
    "audit_actor_user_id"(), "audit_existing_user_id"("changed_row" ->> 'user_id'),
    'success', "previous_row", "next_row"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
DROP TRIGGER "user_roles_audit" ON "user_roles";
--> statement-breakpoint
CREATE TRIGGER "user_roles_audit" AFTER INSERT OR UPDATE OR DELETE ON "user_roles"
FOR EACH ROW EXECUTE FUNCTION "audit_user_role_change"();
--> statement-breakpoint
CREATE FUNCTION "audit_invitation_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  "previous_row" jsonb;
  "next_row" jsonb;
  "changed_row" jsonb;
  "action_name" text := 'invitation.updated';
  "operation_name" "audit_operation" := 'update';
BEGIN
  IF TG_OP = 'INSERT' THEN
    "next_row" := to_jsonb(NEW) - 'token_hash';
    "action_name" := 'invitation.created';
    "operation_name" := 'create';
  ELSIF TG_OP = 'DELETE' THEN
    "previous_row" := to_jsonb(OLD) - 'token_hash';
    "action_name" := 'invitation.deleted';
    "operation_name" := 'delete';
  ELSE
    "previous_row" := to_jsonb(OLD) - 'token_hash';
    "next_row" := to_jsonb(NEW) - 'token_hash';
    IF "previous_row" = "next_row" THEN
      RETURN NULL;
    END IF;
    IF OLD."status" IS DISTINCT FROM NEW."status" AND NEW."status" = 'accepted' THEN
      "action_name" := 'invitation.accepted';
    ELSIF OLD."status" IS DISTINCT FROM NEW."status" AND NEW."status" = 'revoked' THEN
      "action_name" := 'invitation.revoked';
      "operation_name" := 'delete';
    END IF;
  END IF;

  "changed_row" := COALESCE("next_row", "previous_row");
  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "target_user_id", "status", "previous_value", "new_value"
  ) VALUES (
    "action_name", "operation_name", 'invitation', "changed_row" ->> 'id',
    "audit_actor_user_id"(), "audit_existing_user_id"("changed_row" ->> 'accepted_user_id'),
    'success', "previous_row", "next_row"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
DROP TRIGGER "invitations_audit" ON "invitations";
--> statement-breakpoint
CREATE TRIGGER "invitations_audit" AFTER INSERT OR UPDATE OR DELETE ON "invitations"
FOR EACH ROW EXECUTE FUNCTION "audit_invitation_change"();
--> statement-breakpoint
DROP TRIGGER "role_permissions_audit" ON "role_permissions";
--> statement-breakpoint
-- Antes del borrado, porque los permisos del rol se borran en cascada.
CREATE FUNCTION "audit_role_deletion"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "status", "previous_value"
  ) VALUES (
    'role.deleted', 'delete', 'role', OLD."id"::text, "audit_actor_user_id"(),
    'success',
    to_jsonb(OLD) || jsonb_build_object(
      'permissions',
      COALESCE(
        (SELECT jsonb_agg("permission" ORDER BY "permission") FROM "role_permissions" WHERE "role_id" = OLD."id"),
        '[]'::jsonb
      )
    )
  );
  RETURN OLD;
END;
$$;
--> statement-breakpoint
DROP TRIGGER "roles_audit" ON "roles";
--> statement-breakpoint
CREATE TRIGGER "roles_audit" AFTER INSERT OR UPDATE ON "roles"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('role', 'id', '');
--> statement-breakpoint
CREATE TRIGGER "roles_deletion_audit" BEFORE DELETE ON "roles"
FOR EACH ROW EXECUTE FUNCTION "audit_role_deletion"();
