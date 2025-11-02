// scripts/fix-stuck-migration.cjs
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Vercel のログに毎回出ているやつ
const BAD_MIGRATION_NAME = "20251029151251_init";

async function main() {
  console.log("[fix-stuck] start");
  // いまどうなってるか一応見る
  try {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "id", "migration_name", "started_at", "finished_at", "rolled_back_at" FROM "_prisma_migrations" ORDER BY "started_at" DESC'
    );
    console.log("[fix-stuck] current _prisma_migrations:", rows);
  } catch (e) {
    console.log("[fix-stuck] could not SELECT _prisma_migrations:", e.message || e);
  }

  // 問題の行を消す
  try {
    const del = await prisma.$executeRawUnsafe(
      'DELETE FROM "_prisma_migrations" WHERE "migration_name" = $1 OR "migration_name" LIKE $2',
      BAD_MIGRATION_NAME,
      "%init%"
    );
    console.log("[fix-stuck] delete result:", del);
  } catch (e) {
    console.log("[fix-stuck] delete failed, but continue:", e.message || e);
  }

  // 念のため finished_at が NULL のやつも落とす
  try {
    const del2 = await prisma.$executeRawUnsafe(
      'DELETE FROM "_prisma_migrations" WHERE "finished_at" IS NULL'
    );
    console.log("[fix-stuck] delete unfinished result:", del2);
  } catch (e) {
    console.log("[fix-stuck] delete unfinished failed, but continue:", e.message || e);
  }

  await prisma.$disconnect();
  console.log("[fix-stuck] done");
}

main().catch((e) => {
  console.log("[fix-stuck] fatal:", e);
  process.exit(0); // ここでは落とさない
});
