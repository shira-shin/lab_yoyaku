"use client";

type SignOutParams = {
  callbackUrl?: string;
};

type SignInOptions = {
  callbackUrl?: string;
};

export async function signOut(options?: SignOutParams) {
  if (typeof window === "undefined") return;
  const callbackUrl = options?.callbackUrl ?? "/";
  const url = new URL("/api/auth/logout", window.location.origin);
  if (callbackUrl) {
    url.searchParams.set("callbackUrl", callbackUrl);
  }
  window.location.href = url.toString();
}

export async function signIn(provider: string, options?: SignInOptions) {
  if (typeof window === "undefined") return;
  const callbackUrl = options?.callbackUrl ?? "/dashboard";
  const target = new URL(`/api/auth/signin/${provider}`, window.location.origin);
  if (callbackUrl) {
    target.searchParams.set("callbackUrl", callbackUrl);
  }
  window.location.href = target.toString();
}
