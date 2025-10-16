import NextAuth from "next-auth";

import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
