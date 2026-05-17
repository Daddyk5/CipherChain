import { collection, onSnapshot, orderBy, query, serverTimestamp, addDoc } from 'firebase/firestore'
import { firestore } from './client.js'

export function subscribeToEncryptedMessages(conversationId, onMessages) {
  const messagesRef = collection(firestore, 'conversations', conversationId, 'messages')
  const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'))

  return onSnapshot(messagesQuery, (snapshot) => {
    onMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
  })
}

export function sendEncryptedMessage(conversationId, payload) {
  const messagesRef = collection(firestore, 'conversations', conversationId, 'messages')

  return addDoc(messagesRef, {
    ...payload,
    createdAt: serverTimestamp(),
  })
}
