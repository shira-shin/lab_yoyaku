const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const WEB_DIR = path.resolve(__dirname, '../web');
const SCHEMA = './prisma/schema.prisma';
const FAILED_MIG = '202510100900_auth_normalization';
const SQL_FIX = path.resolve(__dirname, './sql/mark_auth_normalization_applied.sql');
const BANNER = '[MIG-DRIVER v3]';

function sh(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}
function shOut(cmd, opts = {}) {
  return String(execSync(cmd, { stdio: ['ignore','pipe','pipe'], shell: true, ...opts }));
}

console.log(BANNER, '[SCRIPT]', __filename, 'sha1=' + crypto.createHash('sha1').update(fs.readFileSync(__filename)).digest('hex').slice(0,8));
console.log('[SCHEMA]', path.join(WEB_DIR, 'prisma/schema.prisma'));
console.log('[CWD:WEB]', WEB_DIR);

// 0) まずは “強制 resolve” を必ず実行（P3009 が残っていても消す）
//    ここで失敗しても続行。後段で再度 deploy が走る。
try {
  console.log(BANNER, '[FORCE-RESOLVE] try --applied', FAILED_MIG);
  sh(`pnpm exec prisma migrate resolve --schema=${SCHEMA} --applied ${FAILED_MIG}`, { cwd: WEB_DIR });
  console.log(BANNER, '[FORCE-RESOLVE] applied OK');
} catch (e) {
  console.log(BANNER, '[FORCE-RESOLVE] applied failed:', (e && e.message) || e);
  // Prisma の resolve が通らない場合は SQL フォールバック
  try {
    if (fs.existsSync(SQL_FIX)) {
      console.log(BANNER, '[FALLBACK] run SQL fix:', SQL_FIX);
      sh(`pnpm exec prisma db execute --schema=${SCHEMA} --file=${SQL_FIX}`, { cwd: path.resolve(__dirname, '..') });
      console.log(BANNER, '[FALLBACK] SQL fix done');
    } else {
      console.log(BANNER, '[FALLBACK] SQL file missing:', SQL_FIX);
    }
  } catch (e2) {
    console.log(BANNER, '[FALLBACK] SQL fix failed:', (e2 && e2.message) || e2);
  }
}

// 1) ここで status を JSON 取得し、failed が空か確認（ログに必ず出す）
try {
  const st = shOut(`pnpm exec prisma migrate status --schema=${SCHEMA} --json`, { cwd: WEB_DIR });
  console.log(BANNER, '[STATUS]', st);
} catch (e) {
  console.log(BANNER, '[STATUS] read failed:', (e && e.message) || e);
}

// 2) Prisma Client generate（schema を明示）
sh(`pnpm exec prisma generate --schema=${SCHEMA}`, { cwd: WEB_DIR });

// 3) 最後に deploy（schema 明示 & cwd 固定）
sh(`pnpm exec prisma migrate deploy --schema=${SCHEMA}`, { cwd: WEB_DIR });
