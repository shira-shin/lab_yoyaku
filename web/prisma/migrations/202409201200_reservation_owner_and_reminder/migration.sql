ALTER TABLE "Reservation"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "reminderMinutes" INTEGER;

ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

UPDATE "Reservation" AS r
SET "userId" = u."id"
FROM "User" AS u
WHERE r."userEmail" IS NOT NULL
  AND u."email" IS NOT NULL
  AND lower(r."userEmail") = lower(u."email");
