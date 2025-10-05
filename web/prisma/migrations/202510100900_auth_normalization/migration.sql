-- Add normalizedEmail column and migrate existing data
ALTER TABLE "User" ADD COLUMN "normalizedEmail" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

UPDATE "User"
SET "normalizedEmail" = lower(btrim("email"));

ALTER TABLE "User"
ALTER COLUMN "normalizedEmail" SET NOT NULL;

-- Drop old unique constraint on email if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'User_email_key'
  ) THEN
    EXECUTE 'DROP INDEX "User_email_key"';
  END IF;
END $$;

CREATE UNIQUE INDEX "User_normalizedEmail_key" ON "User"("normalizedEmail");
