import http from 'node:http'
import { createApp } from './app.js'
import { attachSockets } from './sockets/index.js'
import { env } from './config/env.js'

const app = createApp()
const server = http.createServer(app)

attachSockets(server)

server.listen(env.PORT, () => {
  console.log(`CipherChain API listening on port ${env.PORT}`)
})
