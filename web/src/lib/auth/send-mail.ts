import { getBaseUrl } from "@/lib/get-base-url";

type MailProvider = "resend" | "sendgrid" | "smtp" | "none";

type SendAuthMailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type SendAuthMailResult = {
  delivered: boolean;
  provider: MailProvider;
  error?: string;
};

function detectMailProvider(): MailProvider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  if (process.env.SMTP_HOST) return "smtp";
  return "none";
}

export async function sendAuthMail(
  params: SendAuthMailParams
): Promise<SendAuthMailResult> {
  const baseUrl = process.env.AUTH_BASE_URL || getBaseUrl();
  const provider = detectMailProvider();

  console.info("[auth-mail]", {
    baseUrl,
    to: params.to,
    subject: params.subject,
    provider,
  });

  if (provider === "none") {
    console.warn("[auth-mail] delivery=failed (reason=no-provider)");
    return { delivered: false, provider, error: "no-provider" };
  }

  console.warn("[auth-mail] delivery=failed (reason=not-implemented)");
  return { delivered: false, provider, error: "not-implemented" };
}
