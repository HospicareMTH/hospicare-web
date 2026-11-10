import { Resend } from "resend";
import { z } from "zod";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  actionUrl: string;
};

type MailTransport = (message: MailMessage) => Promise<void>;

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

const resendEnvironmentSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().min(1),
});

function createResendTransport(
  environment: z.infer<typeof resendEnvironmentSchema>,
): MailTransport {
  const resend = new Resend(environment.RESEND_API_KEY);
  return async ({ to, subject, text }) => {
    const { error } = await resend.emails.send({
      from: environment.MAIL_FROM,
      to,
      subject,
      text,
    });
    if (error) {
      throw new Error(
        `El servicio de correo rechazó el envío (${error.name}).`,
      );
    }
  };
}

const consoleTransport: MailTransport = async ({ subject, actionUrl }) => {
  // Solo asunto y enlace: los registros del servidor no llevan datos personales.
  console.info(`[correo] ${subject}: ${actionUrl}`);
};

function isLocalApplication(): boolean {
  const applicationUrl = process.env.BETTER_AUTH_URL;
  return (
    applicationUrl !== undefined &&
    LOCAL_HOSTNAMES.has(new URL(applicationUrl).hostname)
  );
}

function createTransport(): MailTransport {
  const environment = resendEnvironmentSchema.safeParse(process.env);
  if (environment.success) {
    return createResendTransport(environment.data);
  }
  if (isLocalApplication()) {
    return consoleTransport;
  }
  throw new Error(
    "Faltan RESEND_API_KEY y MAIL_FROM: fuera de localhost no se pueden enviar correos.",
  );
}

let transport: MailTransport | undefined;

export function sendMail(message: MailMessage): Promise<void> {
  transport ??= createTransport();
  return transport(message);
}
