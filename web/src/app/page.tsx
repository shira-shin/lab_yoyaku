import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import HomeDashboard from './_parts/HomeDashboard'
import LoginEmbed from './_parts/LoginEmbed'

export default async function Page() {
  const token = cookies().get('auth_token')?.value
  const authed = token ? !!(await verifyToken(token)) : false

  if (authed) {
    return <HomeDashboard />
  }
  return <LoginEmbed />
}
