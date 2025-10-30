-- Mark Prisma migrations as applied to match the existing Neon schema.
-- Run against the database referenced by DIRECT_URL.

BEGIN;

INSERT INTO "prisma_migrations" (
    "id",
    "checksum",
    "finished_at",
    "migration_name",
    "logs",
    "rolled_back_at",
    "started_at",
    "applied_steps_count"
) VALUES
    (
        '202510100900_auth_normalization',
        '8a99c16e228a787f93fb4484c0650bcdf73464df0e72b9ed60ad7ee6608972f7',
        NOW(),
        '202510100900_auth_normalization',
        '',
        NULL,
        NOW(),
        1
    )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "prisma_migrations" (
    "id",
    "checksum",
    "finished_at",
    "migration_name",
    "logs",
    "rolled_back_at",
    "started_at",
    "applied_steps_count"
) VALUES
    (
        '202510100901_auth_normalization_repair',
        'b521d0c6182356b3eb8f1e2ab39e92b8bbc324dca938c64d6dc722eadc41478a',
        NOW(),
        '202510100901_auth_normalization_repair',
        '',
        NULL,
        NOW(),
        1
    )
ON CONFLICT ("id") DO NOTHING;

-- The database already contains the tables from the init migration.
INSERT INTO "prisma_migrations" (
    "id",
    "checksum",
    "finished_at",
    "migration_name",
    "logs",
    "rolled_back_at",
    "started_at",
    "applied_steps_count"
) VALUES
    (
        '202401010000_init',
        '83567e047b4c093910ed1dd9d7a47d3ef8973e03c10baf82013ea36f1a6a6f5c',
        NOW(),
        '202401010000_init',
        '',
        NULL,
        NOW(),
        1
    )
ON CONFLICT ("id") DO NOTHING;

COMMIT;
