import { readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import pg from 'pg'

// TLS is always verified. Managed providers such as Aiven sign server
// certificates with their own CA, so its certificate must be supplied via
// DATABASE_CA_CERT_PATH. There is deliberately no "skip verification" switch:
// an unverified connection lets a network attacker read every row.
function sslConfig({ caCertPath }) {
  if (!caCertPath) {
    return { rejectUnauthorized: true }
  }
  const path = isAbsolute(caCertPath) ? caCertPath : resolve(process.cwd(), caCertPath)
  return { rejectUnauthorized: true, ca: readFileSync(path, 'utf8') }
}

// Drops sslmode/ssl from the URL so they cannot override the explicit TLS config.
function stripSslParams(connectionString) {
  const url = new URL(connectionString)
  for (const key of ['sslmode', 'ssl', 'sslrootcert', 'sslcert', 'sslkey']) {
    url.searchParams.delete(key)
  }
  return url.toString()
}

export function createPool({ connectionString, caCertPath, max = 10 }) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required.')
  }
  const pool = new pg.Pool({
    connectionString: stripSslParams(connectionString),
    ssl: sslConfig({ caCertPath }),
    max,
  })
  pool.on('error', (error) => console.error('Postgres pool error', error))

  return {
    query: (text, params) => pool.query(text, params),
    exec: (sql) => pool.query(sql),
    // Runs fn(tx) inside BEGIN/COMMIT on one pooled connection. Rolls back on error.
    async transaction(fn) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await fn({ query: (text, params) => client.query(text, params) })
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        throw error
      } finally {
        client.release()
      }
    },
    end: () => pool.end(),
  }
}
