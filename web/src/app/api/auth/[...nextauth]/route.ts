import NextAuth from "next-auth";
import { authConfig } from "@/auth/config";

export const { GET, POST } = NextAuth(authConfig);
export const runtime = "nodejs";
