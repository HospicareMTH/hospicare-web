CREATE TRIGGER "table_column_preferences_audit" AFTER INSERT OR UPDATE OR DELETE ON "table_column_preferences"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('table_column_preference', 'table_key', 'user_id');
