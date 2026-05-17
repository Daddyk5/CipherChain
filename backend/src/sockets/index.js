import { Server } from 'socket.io'

export function attachSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    },
  })

  io.on('connection', (socket) => {
    socket.on('presence:join', (payload) => {
      socket.broadcast.emit('presence:update', payload)
    })
  })

  return io
}
