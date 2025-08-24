import { readUserFromCookie } from '@/lib/auth';
import HomeDashboard from './_parts/HomeDashboard';
import LoginEmbed from './_parts/LoginEmbed';

export default async function Page() {
  const me = await readUserFromCookie();

  if (me) {
    return <HomeDashboard />;
  }
  return <LoginEmbed />;
}
