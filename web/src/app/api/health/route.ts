export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
export async function GET() {
  try { await prisma.$queryRaw`SELECT NOW()`; return new Response('ok',{status:200}) }
  catch(e:any){ console.error(e); return new Response(e.message,{status:500}) }
}
