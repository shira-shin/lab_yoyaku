import { PrismaClient } from '@prisma/client'
const g = global as any
export const prisma: PrismaClient = g.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') g.prisma = prisma
