import NextAuth from "next-auth";

import { authOptions } from "@/auth/config";

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
export { authOptions };
export const authConfig = authOptions;
export type { NextAuthConfig } from "next-auth";
