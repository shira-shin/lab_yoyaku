CREATE TYPE "DutyVisibility" AS ENUM ('PUBLIC', 'MEMBERS_ONLY');
CREATE TYPE "DutyManagePolicy" AS ENUM ('ADMINS_ONLY', 'MEMBERS_ALLOWED');

ALTER TABLE "Group" ADD COLUMN "dutyManagePolicy" "DutyManagePolicy" NOT NULL DEFAULT 'ADMINS_ONLY';

CREATE TABLE "DutyType" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#7c3aed',
  "visibility" "DutyVisibility" NOT NULL DEFAULT 'PUBLIC',
  CONSTRAINT "DutyType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DutyType_groupId_name_key" ON "DutyType"("groupId", "name");

CREATE TABLE "DutyRule" (
  "id" TEXT NOT NULL,
  "typeId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "byWeekday" INTEGER[] NOT NULL,
  "slotsPerDay" INTEGER NOT NULL DEFAULT 1,
  "includeMemberIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "excludeMemberIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "avoidConsecutive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "DutyRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DutyAssignment" (
  "id" TEXT NOT NULL,
  "typeId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "slotIndex" INTEGER NOT NULL,
  "assigneeId" TEXT,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "done" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "DutyAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DutyAssignment_groupId_typeId_date_slotIndex_key"
  ON "DutyAssignment"("groupId", "typeId", "date", "slotIndex");

ALTER TABLE "DutyType"
  ADD CONSTRAINT "DutyType_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DutyRule"
  ADD CONSTRAINT "DutyRule_typeId_fkey"
  FOREIGN KEY ("typeId") REFERENCES "DutyType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DutyAssignment"
  ADD CONSTRAINT "DutyAssignment_typeId_fkey"
  FOREIGN KEY ("typeId") REFERENCES "DutyType"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DutyAssignment_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DutyAssignment_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
