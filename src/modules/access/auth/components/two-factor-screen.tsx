import { PublicPageFrame } from "./public-page-frame";
import { TwoFactorForm } from "./two-factor-form";

const TITLE_ID = "two-factor-title";

export function TwoFactorScreen() {
  return (
    <PublicPageFrame title="Verificá que sos vos" titleId={TITLE_ID}>
      <TwoFactorForm labelledBy={TITLE_ID} />
    </PublicPageFrame>
  );
}
