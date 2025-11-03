-- Add updatedAt for Device if missing (compatible with Prisma DateTime)
ALTER TABLE "Device"
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
