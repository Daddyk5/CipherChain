import { describe, expect, it, vi } from 'vitest'
import { authenticateSocket } from '../src/sockets/index.js'

function run(sessionService, auth) {
  const socket = { handshake: { auth }, data: {} }
  const next = vi.fn()
  return authenticateSocket(sessionService)(socket, next).then(() => ({ socket, next }))
}

describe('socket authentication', () => {
  it('rejects connections without a valid session', async () => {
    const sessionService = { verifySession: vi.fn().mockResolvedValue(null) }
    const { next, socket } = await run(sessionService, { token: 'bad' })
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'UNAUTHENTICATED' }))
    expect(socket.data.user).toBeUndefined()
  })

  it('rejects when session lookup throws', async () => {
    const sessionService = { verifySession: vi.fn().mockRejectedValue(new Error('db down')) }
    const { next } = await run(sessionService, { token: 'x' })
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'UNAUTHENTICATED' }))
  })

  it('attaches the verified user', async () => {
    const user = { uid: '0xabc', walletAddress: '0xABC', isAdmin: false }
    const sessionService = { verifySession: vi.fn().mockResolvedValue(user) }
    const { next, socket } = await run(sessionService, { token: 'good' })
    expect(next).toHaveBeenCalledWith()
    expect(socket.data.user).toBe(user)
  })
})
