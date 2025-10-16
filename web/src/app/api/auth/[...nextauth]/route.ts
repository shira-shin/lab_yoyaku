import NextAuth from "next-auth";
import { authConfig } from "@/auth";

export const { handlers: { GET, POST } } = NextAuth(authConfig);
