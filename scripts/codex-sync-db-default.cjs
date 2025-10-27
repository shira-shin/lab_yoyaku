// 要: npm i -D pg
const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DIRECT_URL or DATABASE_URL is required');

  const client = new Client({ connectionString: url });
  await client.connect();

  const { rows } = await client.query(`
    SELECT pg_get_expr(d.adbin, d.adrelid) AS default_expr
    FROM pg_attrdef d
    JOIN pg_class c ON c.oid = d.adrelid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.adnum
    WHERE c.relname='Device' AND a.attname='qrToken';
  `);
  await client.end();

  if (!rows.length) throw new Error('qrToken default not found');
  const expr = rows[0].default_expr; // 例: md5((random())::text || clock_timestamp()::text)

  const schemaPath = 'web/prisma/schema.prisma';
  let s = fs.readFileSync(schemaPath, 'utf8');

  // 型の明記（なければ付ける）
  if (!/qrToken.*@db\.VarChar\(32\)/s.test(s)) {
    s = s.replace(/(qrToken\s+String[^\n]*\n)/, 'qrToken String @db.VarChar(32)\n');
  }

  // dbgenerated を expr で置換（見つからない場合は追記）
  if (/@default\(dbgenerated\(".*?"\)\)/s.test(s)) {
    s = s.replace(/@default\(dbgenerated\(".*?"\)\)/s, `@default(dbgenerated("${expr.replace(/"/g, '\\"')}"))`);
  } else {
    s = s.replace(/(qrToken[^\n]*\n)/, m => m.replace(/\n$/, `  @default(dbgenerated("${expr.replace(/"/g, '\\"')}"))\n`));
  }

  fs.writeFileSync(schemaPath, s);
  console.log('[codex] schema.prisma updated with default:', expr);
}

main().catch(e => { console.error(e); process.exit(1); });
