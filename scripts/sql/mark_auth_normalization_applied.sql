UPDATE "_prisma_migrations"
   SET finished_at = now(), applied_steps_count = 1, logs = NULL
 WHERE migration_name = '202510100900_auth_normalization'
   AND finished_at IS NULL;
