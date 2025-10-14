import 'server-only';
import { readUserFromCookie } from '@/auth';

export async function getUserFromCookies() {
  return readUserFromCookie();
}
