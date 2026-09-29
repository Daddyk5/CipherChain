import http from 'node:http'
import { createApp } from './app.js'
import { createPostgresNonceStore } from './auth/nonceStore.js'
import { createSessionService } from './auth/sessionService.js'
import { createWalletAuthService } from './auth/walletAuthService.js'
import { env } from './config/env.js'
import { attachSockets } from './sockets/index.js'

// Builds the HTTP + Socket.io server around any database adapter exposing
// query/exec/transaction (node-pg pool in production, PGlite in demo mode).
export function createServer({ db }) {
  const sessionService = createSessionService({
    db,
    adminAddresses: env.ADMIN_WALLET_ADDRESSES,
    ttlMs: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  })

  let io
  const app = createApp({
    db,
    notify: (recipientAddress, envelope) => io?.to(`user:${recipientAddress}`).emit('message:new', envelope),
    auth: {
      walletAuthService: createWalletAuthService({
        nonceStore: createPostgresNonceStore(db),
        domain: env.AUTH_DOMAIN,
        uri: env.AUTH_URI,
        allowedChainIds: env.AUTH_ALLOWED_CHAIN_IDS,
        ttlMs: env.AUTH_NONCE_TTL_SECONDS * 1000,
      }),
      sessionService,
    },
  })
  const server = http.createServer(app)
  io = attachSockets(server, { sessionService })

  return server
}
