import { FieldValue } from 'firebase-admin/firestore'

// Turns a verified wallet address into a Firebase session. The Firebase uid is
// the lowercase wallet address, so Firestore rules can compare `request.auth.uid`
// directly against document ids.
export function createFirebaseSessionIssuer({ auth, firestore, adminAddresses = [] }) {
  return {
    async issueSession(checksumAddress) {
      const uid = checksumAddress.toLowerCase()
      const userRef = firestore.collection('users').doc(uid)

      await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(userRef)
        if (snapshot.exists) {
          transaction.update(userRef, { lastLoginAt: FieldValue.serverTimestamp() })
        } else {
          transaction.set(userRef, {
            walletAddress: checksumAddress,
            displayName: null,
            createdAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(),
          })
        }
      })

      const claims = { wallet: checksumAddress }
      if (adminAddresses.includes(uid)) {
        claims.admin = true
      }

      const firebaseToken = await auth.createCustomToken(uid, claims)
      return { firebaseToken, walletAddress: checksumAddress, isAdmin: Boolean(claims.admin) }
    },
  }
}
