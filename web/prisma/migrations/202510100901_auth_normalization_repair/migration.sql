-- repair: make migration idempotent and align to current DB
DO $$
BEGIN
  -- 列が無ければ作る（実運用では既に存在している想定）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'normalizedEmail'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "normalizedEmail" text NOT NULL DEFAULT '';
    -- 既存レコードを埋める（email がある前提）
    UPDATE "User"
       SET "normalizedEmail" = lower(trim("email"))
     WHERE "normalizedEmail" = '' OR "normalizedEmail" IS NULL;
    ALTER TABLE "User" ALTER COLUMN "normalizedEmail" DROP DEFAULT;
  END IF;

  -- ユニークインデックスが無ければ作る
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname = 'User_normalizedEmail_key'
  ) THEN
    CREATE UNIQUE INDEX "User_normalizedEmail_key" ON public."User" ("normalizedEmail");
  END IF;
END $$;

-- align Device.qrToken default with schema/Neon implementation
ALTER TABLE "Device"
  ALTER COLUMN "qrToken"
  SET DEFAULT md5(((random())::text || (clock_timestamp())::text));
