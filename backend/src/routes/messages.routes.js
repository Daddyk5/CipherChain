import { Router } from 'express'
import { verifyMessageHash } from '../controllers/messageController.js'
import { ackSchema, sendMessagesSchema } from '../messaging/messageRelayService.js'

function handle(fn) {
  return (request, response, next) => Promise.resolve(fn(request, response)).catch(next)
}

export function createMessagesRouter({ messageRelay, requireUser }) {
  const messagesRouter = Router()

  messagesRouter.use(requireUser)

  messagesRouter.post('/', handle(async (request, response) => {
    const parsed = sendMessagesSchema.safeParse(request.body)
    if (!parsed.success) {
      return response.status(400).json({ code: 'INVALID_REQUEST', message: 'Invalid request body.', issues: parsed.error.issues })
    }
    return response.status(201).json({ sent: await messageRelay.send(request.user, parsed.data) })
  }))

  messagesRouter.get('/inbox', handle(async (request, response) => {
    const deviceId = Number(request.query.deviceId)
    if (!Number.isInteger(deviceId) || deviceId < 1) {
      return response.status(400).json({ code: 'INVALID_DEVICE', message: 'deviceId is required.' })
    }
    return response.json({ envelopes: await messageRelay.inbox(request.user, deviceId) })
  }))

  messagesRouter.post('/ack', handle(async (request, response) => {
    const parsed = ackSchema.safeParse(request.body)
    if (!parsed.success) {
      return response.status(400).json({ code: 'INVALID_REQUEST', message: 'Invalid request body.', issues: parsed.error.issues })
    }
    return response.json({ deleted: await messageRelay.ack(request.user, parsed.data) })
  }))

  messagesRouter.post('/verify-hash', verifyMessageHash)

  return messagesRouter
}
