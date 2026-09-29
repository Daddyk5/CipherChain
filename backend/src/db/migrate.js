import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

// Applies pending migrations in filename order. `db` needs `query(text, params)`
// and `exec(sql)` for multi-statement files (node-pg Pool and PGlite both work
// through the adapter in pool.js).
export async function migrate(db, { log = () => {} } = {}) {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`)

  const { rows } = await db.query('SELECT name FROM schema_migrations')
  const applied = new Set(rows.map((row) => row.name))
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort()

  for (const file of files) {
    if (applied.has(file)) {
      continue
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8')
    await db.exec(`BEGIN;\n${sql}\nINSERT INTO schema_migrations (name) VALUES ('${file.replaceAll("'", "''")}');\nCOMMIT;`)
    log(`applied ${file}`)
  }
}
