import { redirect } from "next/navigation";
import { AuthButtons } from "@/components/AuthButtons";
import { auth } from "@/auth";

function resolveCallbackUrl(searchParams?: { [key: string]: string | string[] | undefined }) {
  const rawCallback = typeof searchParams?.callbackUrl === "string" ? searchParams?.callbackUrl : undefined;
  const rawNext = typeof searchParams?.next === "string" ? searchParams?.next : undefined;
  const candidate = rawCallback ?? rawNext;
  if (candidate && candidate.startsWith("/")) {
    return candidate;
  }
  return "/";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const callbackUrl = resolveCallbackUrl(searchParams);
  const session = await auth();

  if (session?.user) {
    redirect(callbackUrl || "/");
  }

  return (
    <main className="max-w-md mx-auto py-16 px-4">
      <h1 className="text-2xl font-semibold mb-4">サインイン</h1>
      <p className="mb-6 text-sm text-gray-600">Google アカウントでサインインしてください。</p>
      <AuthButtons callbackUrl={callbackUrl} showSignOut={false} />
    </main>
  );
}
