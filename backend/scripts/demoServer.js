// Runs the full API against an in-process, in-memory Postgres (PGlite).
// No external database needed: useful for local demos, UI work and screenshots.
// All data is lost when the process exits. Never use this in production.
import { PGlite } from '@electric-sql/pglite'
import { env } from '../src/config/env.js'
import { createServer } from '../src/createServer.js'
import { migrate } from '../src/db/migrate.js'

const pglite = new PGlite()
const db = {
  query: (text, params) => pglite.query(text, params),
  exec: (sql) => pglite.exec(sql),
  transaction: (fn) => pglite.transaction((tx) => fn({ query: (text, params) => tx.query(text, params) })),
}
await migrate(db)

createServer({ db }).listen(env.PORT, () => {
  console.log(`CipherChain API (demo, in-memory Postgres) listening on port ${env.PORT}`)
})
