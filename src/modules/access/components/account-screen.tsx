import { ACCOUNT_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { Separator } from "@/components/ui/separator";

import { requireSession } from "../session";
import { AccountNamePanel } from "./account-name-panel";
import { AccountPasswordPanel } from "./account-password-panel";
import { EmailVerificationPanel } from "./email-verification-panel";
import { TwoFactorPanel } from "./two-factor-panel";

function AccountSection({
  title,
  titleId,
  children,
}: {
  title: string;
  titleId: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export async function AccountScreen() {
  const { user } = await requireSession();
  const isTwoFactorEnabled = user.twoFactorEnabled === true;

  return (
    <SectionSheet destination={ACCOUNT_DESTINATION}>
      <div className="flex flex-col gap-8">
        <AccountSection title="Nombre" titleId="account-name-title">
          <AccountNamePanel
            name={user.name}
            isEmailVerified={user.emailVerified}
          />
        </AccountSection>
        <Separator />
        <AccountSection title="Correo" titleId="account-email-title">
          <EmailVerificationPanel
            email={user.email}
            isEmailVerified={user.emailVerified}
          />
        </AccountSection>
        <Separator />
        <AccountSection title="Contraseña" titleId="account-password-title">
          <AccountPasswordPanel isEmailVerified={user.emailVerified} />
        </AccountSection>
        <Separator />
        <AccountSection
          title="Segundo factor"
          titleId="account-two-factor-title"
        >
          <TwoFactorPanel
            isEmailVerified={user.emailVerified}
            isTwoFactorEnabled={isTwoFactorEnabled}
          />
        </AccountSection>
      </div>
    </SectionSheet>
  );
}
