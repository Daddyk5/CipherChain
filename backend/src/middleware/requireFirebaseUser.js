import { getFirebaseAdminAuth } from '../services/firebaseAdminService.js'

// Checks the Firebase ID token in `Authorization: Bearer <token>` and attaches
// `request.user = { uid, walletAddress, isAdmin }`.
export function createRequireFirebaseUser(verifyIdToken = (token) => getFirebaseAdminAuth().verifyIdToken(token)) {
  return async function requireFirebaseUser(request, response, next) {
    const header = request.header('authorization') ?? ''
    const [scheme, token] = header.split(' ')

    if (scheme !== 'Bearer' || !token) {
      return response.status(401).json({ code: 'UNAUTHENTICATED', message: 'Authentication required.' })
    }

    try {
      const decoded = await verifyIdToken(token)
      request.user = {
        uid: decoded.uid,
        walletAddress: decoded.wallet ?? decoded.uid,
        isAdmin: decoded.admin === true,
      }
      return next()
    } catch {
      return response.status(401).json({ code: 'INVALID_TOKEN', message: 'Session is invalid or expired.' })
    }
  }
}

export const requireFirebaseUser = createRequireFirebaseUser()
