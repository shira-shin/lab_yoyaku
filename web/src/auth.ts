import NextAuth from "next-auth";

import { authConfig } from "@/shared/auth/options";

export const { auth, signIn, signOut } = NextAuth(authConfig);
export { authConfig };
export type { NextAuthConfig } from "next-auth";
