# Auth Debugging Plan

This document captures the temporary diagnostics and fixes that need to land to investigate the production 401s.

## Temporary debug endpoint
- Add `web/src/app/api/debug/auth-state/route.ts` that returns core user info (id/email/normalizedEmail/passwordHashLength/createdAt/updatedAt) and runtime env details (APP_URL/NEXT_PUBLIC_APP_URL/VERCEL_URL).
- Guard it with a token query parameter (`token=`) that must match `process.env.AUTH_DEBUG_TOKEN`. Return `500` if the env var is missing and `403` if the token mismatches. Never log or expose the raw password hash length other than length.

## Auth/login logging
- Update `web/src/app/api/auth/login/route.ts` to log:
  - The runtime base URL from the new helper.
  - The submitted email and normalized email.
  - Whether the user lookup failed, the password hash is missing, or the password comparison failed.
- Keep the existing Prisma error handling / password rehash logic intact.

## Base URL helper
- Replace every ad-hoc base URL helper usage with the single helper in `web/src/lib/get-base-url.ts` and make sure it prefers `AUTH_BASE_URL`, then `APP_URL`, then `NEXT_PUBLIC_APP_URL`, then `VERCEL_URL` (with `https://`), and finally `http://localhost:3000`.
- Ensure `/api/auth/forgot-password`, `/api/cookies/delete`, `/api/auth/reset-password`, and every server-side fetch that builds absolute URLs rely on this helper. No literal `"/api/cookies/delete"` without `getBaseUrl()`.

## Bootstrap admin
- Create `web/scripts/ensure-admin.ts` to upsert a bootstrap user using `AUTH_BOOTSTRAP_EMAIL` and `AUTH_BOOTSTRAP_PASSWORD` (hashed with bcryptjs). Skip work when env vars are missing. Update `scripts/migrate-deploy.cjs` to run this script right after `prisma migrate deploy` (after migrations succeed).

## Forgot password response
- When there is no mail provider configured (`SMTP_HOST`/`RESEND_API_KEY` etc.), have `/api/auth/forgot-password` respond with `{ ok: true, resetUrl, note }` instead of only logging the URL. Continue logging for visibility.
- Update `.env.example` with the required mail provider env vars and the new auth-specific env vars (`AUTH_BASE_URL`, `AUTH_BOOTSTRAP_EMAIL`, `AUTH_BOOTSTRAP_PASSWORD`).

## Cookie deletion fetches
- Audit all places calling `/api/cookies/delete` on the server and ensure they use the shared helper. If the fetch still fails (e.g. 401) log a warning but let the outer request succeed.

## Post-deploy verification
Include these manual checks in the PR description:
1. Hit `/api/debug/auth-state?token=...` and verify env values and the user list (normalizedEmail populated, passwordHashLength > 0).
2. Use the same credentials against `/api/auth/login` and expect 200.
3. Call `/api/auth/forgot-password` and verify the JSON contains `https://labyoyaku.vercel.app/reset-password?...`.
4. Confirm page loads do **not** log `/api/cookies/delete 401` anymore.
