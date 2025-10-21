"use client";
import { signIn } from "next-auth/react";

export default function Login() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm space-y-8 rounded-2xl border bg-card p-8 shadow-sm">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Continue with your Google account to access your dashboard.
          </p>
        </header>
        <div className="space-y-3">
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              focusable="false"
            >
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.78-.06-1.53-.17-2.27H12v4.29h6.48c-.28 1.44-1.12 2.66-2.38 3.48v2.89h3.84c2.24-2.07 3.55-5.12 3.55-8.39z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.93l-3.84-2.9c-1.06.72-2.42 1.15-4.09 1.15-3.15 0-5.82-2.13-6.78-5.01H1.24v3.14C3.2 21.54 7.3 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.22 14.31c-.24-.72-.38-1.48-.38-2.31 0-.8.14-1.57.38-2.3V6.56H1.24A11.99 11.99 0 0 0 0 12c0 1.9.45 3.68 1.24 5.44l3.98-3.13z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.76 0 3.33.6 4.58 1.79l3.42-3.42C17.94 1.27 15.24 0 12 0 7.3 0 3.2 2.46 1.24 6.56l3.98 3.13C6.18 5.88 8.85 3.75 12 3.75z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>
    </main>
  );
}
