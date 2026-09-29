export function bearerToken(request) {
  const [scheme, token] = (request.header('authorization') ?? '').split(' ')
  return scheme === 'Bearer' && token ? token : null
}

// Checks the session token in `Authorization: Bearer <token>` and attaches
// `request.user = { uid, walletAddress, displayName, isAdmin }`.
export function createRequireUser(sessionService) {
  return async function requireUser(request, response, next) {
    const token = bearerToken(request)
    if (!token) {
      return response.status(401).json({ code: 'UNAUTHENTICATED', message: 'Authentication required.' })
    }

    try {
      const user = await sessionService.verifySession(token)
      if (!user) {
        return response.status(401).json({ code: 'INVALID_TOKEN', message: 'Session is invalid or expired.' })
      }
      request.user = user
      return next()
    } catch (error) {
      return next(error)
    }
  }
}
