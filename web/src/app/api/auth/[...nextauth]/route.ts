
﻿export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handlers } from "../../../../auth";
export const { GET, POST } = handlers;


import NextAuth from "next-auth";
import { authConfig } from "@/auth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { handlers } = NextAuth(authConfig);
export const { GET, POST } = handlers;