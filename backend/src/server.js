import { createServer } from './createServer.js'
import { env } from './config/env.js'
import { createPool } from './db/pool.js'

const db = createPool({ connectionString: env.DATABASE_URL, caCertPath: env.DATABASE_CA_CERT_PATH })

createServer({ db }).listen(env.PORT, () => {
  console.log(`CipherChain API listening on port ${env.PORT}`)
})
