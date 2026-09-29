import { isAddress } from 'ethers'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { registerDeviceSchema, rotateSignedPreKeySchema, uploadPreKeysSchema } from '../keys/keyDirectoryService.js'

function parse(schema, request, response) {
  const parsed = schema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).json({ code: 'INVALID_REQUEST', message: 'Invalid request body.', issues: parsed.error.issues })
    return null
  }
  return parsed.data
}

function deviceIdParam(request, response) {
  const deviceId = Number(request.params.deviceId)
  if (!Number.isInteger(deviceId) || deviceId < 1) {
    response.status(400).json({ code: 'INVALID_DEVICE', message: 'Invalid device id.' })
    return null
  }
  return deviceId
}

function handle(fn) {
  return (request, response, next) => Promise.resolve(fn(request, response)).catch(next)
}

export function createKeysRouter({ keyDirectory, requireUser, bundleRateLimitPerMinute = 60 }) {
  const keysRouter = Router()
  // Each bundle fetch burns one-time prekeys, so limit it to slow prekey-exhaustion attacks.
  const bundleLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: bundleRateLimitPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { code: 'RATE_LIMITED', message: 'Too many key requests.' },
  })

  keysRouter.use(requireUser)

  keysRouter.post('/devices', handle(async (request, response) => {
    const input = parse(registerDeviceSchema, request, response)
    if (input) {
      response.status(201).json(await keyDirectory.registerDevice(request.user, input))
    }
  }))

  keysRouter.put('/devices/:deviceId/signed-prekey', handle(async (request, response) => {
    const deviceId = deviceIdParam(request, response)
    const input = deviceId && parse(rotateSignedPreKeySchema, request, response)
    if (input) {
      await keyDirectory.rotateSignedPreKey(request.user, deviceId, input)
      response.status(204).end()
    }
  }))

  keysRouter.post('/devices/:deviceId/prekeys', handle(async (request, response) => {
    const deviceId = deviceIdParam(request, response)
    const input = deviceId && parse(uploadPreKeysSchema, request, response)
    if (input) {
      response.json(await keyDirectory.uploadPreKeys(request.user, deviceId, input.preKeys))
    }
  }))

  keysRouter.get('/devices/:deviceId/prekeys/count', handle(async (request, response) => {
    const deviceId = deviceIdParam(request, response)
    if (deviceId) {
      response.json({ count: await keyDirectory.countPreKeys(request.user, deviceId) })
    }
  }))

  keysRouter.delete('/devices/:deviceId', handle(async (request, response) => {
    const deviceId = deviceIdParam(request, response)
    if (deviceId) {
      await keyDirectory.revokeDevice(request.user, deviceId)
      response.status(204).end()
    }
  }))

  keysRouter.get('/:walletAddress/devices', handle(async (request, response) => {
    if (!isAddress(request.params.walletAddress)) {
      return response.status(400).json({ code: 'INVALID_ADDRESS', message: 'A valid wallet address is required.' })
    }
    return response.json({ devices: await keyDirectory.listDevices(request.params.walletAddress) })
  }))

  keysRouter.get('/:walletAddress/bundles', bundleLimiter, handle(async (request, response) => {
    if (!isAddress(request.params.walletAddress)) {
      return response.status(400).json({ code: 'INVALID_ADDRESS', message: 'A valid wallet address is required.' })
    }
    return response.json({ devices: await keyDirectory.fetchBundles(request.params.walletAddress) })
  }))

  return keysRouter
}
