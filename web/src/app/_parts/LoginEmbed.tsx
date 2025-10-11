"use client";

import { AuthButtons } from "@/components/AuthButtons";

export default function LoginEmbed() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Google アカウントでサインインしてください。</p>
      <AuthButtons showSignOut={false} />
    </div>
  );
}
