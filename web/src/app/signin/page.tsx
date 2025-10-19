import LoginEmbed from '@/app/_parts/LoginEmbed'
import { readUserFromCookie } from '@/lib/auth-legacy'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  const sessionUser = await readUserFromCookie()
  if (sessionUser) {
    redirect('/')
  }

  return <LoginEmbed />
}
