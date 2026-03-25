/**
 * Executa as migrações do Supabase via pg (sem Supabase CLI).
 *
 * Uso:
 *   DATABASE_URL="postgresql://postgres:[SENHA]@db.gnhewmyhbqxpecfaivmu.supabase.co:5432/postgres" node scripts/migrate-supabase.mjs
 *
 * Ou adicione DATABASE_URL ao .env e corra:
 *   npm run db:migrate
 *
 * A URL de ligação encontra-se em:
 *   Supabase Dashboard → Project Settings → Database → Connection string (URI)
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Carrega .env
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
} catch {
  /* dotenv opcional */
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  ERRO: DATABASE_URL não definida.                                ║
║                                                                  ║
║  Adiciona ao .env:                                               ║
║  DATABASE_URL=postgresql://postgres:[SENHA]@db.gnhewmyhbqxpecfaivmu.supabase.co:5432/postgres  ║
║                                                                  ║
║  A senha encontra-se em:                                         ║
║  Supabase Dashboard → Project Settings → Database → DB Password  ║
╚══════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

// Importa pg dinamicamente
let pg;
try {
  pg = (await import('pg')).default;
} catch {
  console.error('ERRO: pacote "pg" não instalado. Corre: npm install pg');
  process.exit(1);
}

const MIGRATION_FILE = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260325000000_mission_agent_hub.sql'
);

let sql;
try {
  sql = readFileSync(MIGRATION_FILE, 'utf8');
} catch {
  console.error(`ERRO: ficheiro de migração não encontrado: ${MIGRATION_FILE}`);
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase.co') ? { rejectUnauthorized: false } : false,
});

console.log('🔗 A ligar ao Supabase…');

try {
  await client.connect();
  console.log('✅ Ligação estabelecida.');

  console.log('▶  A executar migração: 20260325000000_mission_agent_hub.sql');
  await client.query(sql);
  console.log('✅ Migração concluída com sucesso!');
  console.log('');
  console.log('Tabelas criadas:');
  console.log('  • public.task_board   — Kanban realtime');
  console.log('  • public.office_layout — Layout do escritório isométrico');
  console.log('');
  console.log('🚀 O Architecture Agents Hub está pronto para modo multiplayer!');
} catch (err) {
  if (err.message?.includes('already exists')) {
    console.log('ℹ  Tabelas já existem — migração ignorada (idempotente).');
  } else {
    console.error('ERRO na migração:', err.message);
    process.exit(1);
  }
} finally {
  await client.end();
}
