import NextAuth from "next-auth";

import { authConfig } from "@/shared/auth/options";

const { handlers } = NextAuth(authConfig);

export const { GET, POST } = handlers;

export const runtime = "nodejs";
