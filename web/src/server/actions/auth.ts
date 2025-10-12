"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle(formData: FormData) {
  "use server";

  const redirectTo =
    formData.get("callbackUrl")?.toString().trim() || "/dashboard";

  await signIn("google", { redirectTo });
}

export async function signOutCurrentUser(formData: FormData) {
  "use server";

  const redirectTo =
    formData.get("redirectTo")?.toString().trim() || "/signin";

  await signOut({ redirectTo });
}
