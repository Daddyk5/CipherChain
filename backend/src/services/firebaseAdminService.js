import { readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import admin from 'firebase-admin'
import { env } from '../config/env.js'

let firebaseAdminApp

function loadServiceAccount() {
  if (!env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is required for Firebase Admin.')
  }

  const accountPath = isAbsolute(env.FIREBASE_SERVICE_ACCOUNT_PATH)
    ? env.FIREBASE_SERVICE_ACCOUNT_PATH
    : resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH)

  return JSON.parse(readFileSync(accountPath, 'utf8'))
}

export function getFirebaseAdminApp() {
  if (firebaseAdminApp) {
    return firebaseAdminApp
  }

  firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
  })

  return firebaseAdminApp
}

export function getFirebaseAdminAuth() {
  return getFirebaseAdminApp().auth()
}

export function getFirebaseAdminFirestore() {
  return getFirebaseAdminApp().firestore()
}
