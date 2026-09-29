import { Server } from 'socket.io'

// Every socket must present a valid session token in the handshake:
//   io(url, { auth: { token } })
// Each user joins a private room named after their lowercase wallet address,
// so the server can push to a user without trusting client-supplied identities.
export function authenticateSocket(sessionService) {
  return async (socket, next) => {
    try {
      const user = await sessionService.verifySession(socket.handshake.auth?.token)
      if (!user) {
        return next(new Error('UNAUTHENTICATED'))
      }
      socket.data.user = user
      return next()
    } catch {
      return next(new Error('UNAUTHENTICATED'))
    }
  }
}

export function attachSockets(httpServer, { sessionService }) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    },
  })

  io.use(authenticateSocket(sessionService))

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.user.uid}`)
  })

  return io
}
