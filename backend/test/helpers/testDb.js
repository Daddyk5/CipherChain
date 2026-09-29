import { PGlite } from '@electric-sql/pglite'
import { migrate } from '../../src/db/migrate.js'

// A real, in-process Postgres (WASM) with all migrations applied.
export async function createTestDb() {
  const pglite = new PGlite()
  const db = {
    query: (text, params) => pglite.query(text, params),
    exec: (sql) => pglite.exec(sql),
    transaction: (fn) => pglite.transaction((tx) => fn({ query: (text, params) => tx.query(text, params) })),
    end: () => pglite.close(),
  }
  await migrate(db)
  return db
}
