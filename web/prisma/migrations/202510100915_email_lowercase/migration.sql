-- Normalize existing email addresses to the canonical lowercase form
UPDATE "User"
SET
  "email" = lower(btrim("email")),
  "normalizedEmail" = lower(btrim("email"))
WHERE "email" IS NOT NULL;
