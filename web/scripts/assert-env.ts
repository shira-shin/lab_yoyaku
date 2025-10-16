const requiredVars = ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "AUTH_SECRET", "AUTH_URL"] as const;

type RequiredVar = (typeof requiredVars)[number];

const summarize = (label: string, raw: string | undefined) => {
  if (!raw) return `${label}=<missing>`;
  try {
    const url = new URL(raw);
    const pathname = url.pathname === "/" ? "" : url.pathname;
    return `${label}=${url.protocol}//${url.host}${pathname}`;
  } catch {
    return `${label}=<non-url>${raw.length ? ` (${raw.length} chars)` : ""}`.trim();
  }
};

function warn(message: string) {
  console.warn(`[assert-env] ${message}`);
}

function info(message: string) {
  console.log(`[assert-env] ${message}`);
}

const missing: RequiredVar[] = requiredVars.filter((name) => {
  const value = process.env[name];
  return !value || value.trim().length === 0;
});

if (missing.length > 0) {
  warn(`Missing required env vars: ${missing.join(", ")}`);
} else {
  info("All required auth env vars are present.");
}

const authUrl = process.env.AUTH_URL;
const nextAuthUrl = process.env.NEXTAUTH_URL;

if (authUrl) {
  info(summarize("AUTH_URL", authUrl));
}
if (nextAuthUrl) {
  info(summarize("NEXTAUTH_URL", nextAuthUrl));
}

if (authUrl && nextAuthUrl && authUrl !== nextAuthUrl) {
  warn("AUTH_URL and NEXTAUTH_URL differ. Ensure preview deployments set both to the same origin.");
}

const requireTrustedHost =
  process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

if (requireTrustedHost && process.env.AUTH_TRUST_HOST !== "true") {
  console.error(
    "[assert-env] AUTH_TRUST_HOST must be 'true' on Vercel/production.",
  );
  process.exit(1);
}

if (!requireTrustedHost && process.env.AUTH_TRUST_HOST !== "true") {
  warn("AUTH_TRUST_HOST should be set to 'true' when running on Vercel.");
}

info("Environment assertion complete.");
