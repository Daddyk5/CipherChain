import { env } from '../config/env.js'
import { migrate } from './migrate.js'
import { createPool } from './pool.js'

const db = createPool({ connectionString: env.DATABASE_URL, caCertPath: env.DATABASE_CA_CERT_PATH, max: 1 })

try {
  await migrate(db, { log: console.log })
  console.log('Migrations up to date.')
} finally {
  await db.end()
}
