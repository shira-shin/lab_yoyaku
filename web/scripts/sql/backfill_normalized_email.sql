UPDATE "User"
SET "normalizedEmail" = LOWER(TRIM("email"))
WHERE "normalizedEmail" IS NULL
  AND "email" IS NOT NULL;
