import crypto from "node:crypto";

type Payload = {
  email: string;
  exp: number; // UNIX seconds (not ms)
  sig: string; // hex(HMAC-SHA256)
};

function getSecret(): string {
  return (
    process.env.RESET_TOKEN_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    ""
  );
}

function b64urlEncodeJson(obj: object): string {
  const json = JSON.stringify(obj);
  return Buffer.from(json, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecodeJson<T = any>(token: string): T {
  const pad = token.length % 4 ? 4 - (token.length % 4) : 0;
  const fixed = token.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  const json = Buffer.from(fixed, "base64").toString("utf8");
  return JSON.parse(json) as T;
}

function sign(email: string, exp: number, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${email}.${exp}`).digest("hex");
}

// === public ===

export function createResetToken(email: string, ttlSeconds = 30 * 60): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = nowSec + ttlSeconds;
  const secret = getSecret();
  const sig = sign(email, exp, secret);
  const payload: Payload = { email, exp, sig };
  return b64urlEncodeJson(payload);
}

export function verifyResetToken(token: string): { ok: true; email: string } | { ok: false } {
  try {
    const payload = b64urlDecodeJson<Payload>(token);
    if (!payload?.email || !payload?.exp || !payload?.sig) return { ok: false };
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec > payload.exp) return { ok: false };

    const secret = getSecret();
    const expected = sign(payload.email, payload.exp, secret);
    if (expected !== payload.sig) return { ok: false };

    return { ok: true, email: payload.email };
  } catch {
    return { ok: false };
  }
}
