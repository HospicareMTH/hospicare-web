CREATE TRIGGER "invitations_audit" AFTER INSERT OR UPDATE OR DELETE ON "invitations"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('invitation', 'id', 'accepted_user_id', 'token_hash');
