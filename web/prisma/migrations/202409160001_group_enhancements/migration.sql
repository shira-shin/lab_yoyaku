-- AlterTable
ALTER TABLE "Group"
  ADD COLUMN "passcode" TEXT,
  ADD COLUMN "reserveFrom" TIMESTAMP(3),
  ADD COLUMN "reserveTo" TIMESTAMP(3),
  ADD COLUMN "memo" TEXT;

-- AlterTable
ALTER TABLE "Device"
  ADD COLUMN "caution" TEXT,
  ADD COLUMN "code" TEXT,
  ADD COLUMN "qrToken" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Device"
SET "qrToken" = md5(random()::text || clock_timestamp()::text)
WHERE "qrToken" IS NULL;

ALTER TABLE "Device"
  ALTER COLUMN "qrToken" SET NOT NULL,
  ALTER COLUMN "qrToken" SET DEFAULT md5(random()::text || clock_timestamp()::text);

-- AlterTable
ALTER TABLE "Reservation"
  ADD COLUMN "userName" TEXT;

-- CreateTable
CREATE TABLE "GroupMember" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_email_key" ON "GroupMember"("groupId", "email");

-- AddForeignKey
ALTER TABLE "GroupMember"
  ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
