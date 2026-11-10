CREATE TRIGGER "role_permissions_audit" AFTER INSERT OR UPDATE OR DELETE ON "role_permissions"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('role_permission', 'role_id', '');
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission")
SELECT "id", 'documentation.app.view' FROM "roles" WHERE "system_key" = 'user';
