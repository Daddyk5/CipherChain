import { getFirebaseAdminApp } from '../services/firebaseAdminService.js'
import { env } from '../config/env.js'

export function getAdminStatus(_request, response) {
  const app = getFirebaseAdminApp()

  response.json({
    firebaseAdminInitialized: Boolean(app),
    projectId: env.FIREBASE_PROJECT_ID,
    service: 'cipherchain-admin',
  })
}
