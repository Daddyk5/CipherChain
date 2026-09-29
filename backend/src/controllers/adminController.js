export function createAdminController({ db }) {
  return {
    async getAdminStatus(_request, response, next) {
      try {
        const { rows } = await db.query('SELECT (SELECT count(*) FROM users)::int AS users, (SELECT max(name) FROM schema_migrations) AS schema')
        response.json({ database: 'ok', users: rows[0].users, schema: rows[0].schema, service: 'cipherchain-admin' })
      } catch (error) {
        next(error)
      }
    },
  }
}
