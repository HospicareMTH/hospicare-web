import { PasswordRecoveryForm } from "./password-recovery-form";
import { PublicPageFrame } from "./public-page-frame";

const TITLE_ID = "password-recovery-title";

export function PasswordRecoveryScreen() {
  return (
    <PublicPageFrame title="Recuperá tu contraseña" titleId={TITLE_ID}>
      <PasswordRecoveryForm labelledBy={TITLE_ID} />
    </PublicPageFrame>
  );
}
