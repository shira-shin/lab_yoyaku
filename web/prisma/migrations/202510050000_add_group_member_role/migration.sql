CREATE TYPE "GroupMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

ALTER TABLE "GroupMember"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER';

ALTER TABLE "GroupMember"
  ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "GroupMember" gm
SET "userId" = u.id
FROM "User" u
WHERE gm.email = u.email;

UPDATE "GroupMember" gm
SET "role" = 'OWNER'
FROM "Group" g
WHERE gm."groupId" = g.id AND gm.email = g."hostEmail";
