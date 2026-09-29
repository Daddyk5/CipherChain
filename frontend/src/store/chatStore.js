import { create } from 'zustand'
import { apiRequest, getSessionToken } from '../services/api/httpClient.js'
import { getInjectedProvider, signMessage } from '../services/blockchain/walletService.js'
import { startSecureMessaging } from '../services/messaging/secureMessagingClient.js'

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api').replace(/\/api\/?$/, '')

let client = null

export const useChatStore = create((set, get) => ({
  status: 'idle', // idle | connecting | ready | error
  error: null,
  deviceId: null,
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,

  connect: async (walletAddress) => {
    if (client || get().status === 'connecting') {
      return
    }
    set({ status: 'connecting', error: null })
    try {
      client = await startSecureMessaging({
        walletAddress,
        api: apiRequest,
        sessionToken: getSessionToken(),
        socketUrl: SOCKET_URL,
        // Only called the first time this browser sets up encrypted messaging.
        signStatement: (text) => signMessage(getInjectedProvider(), walletAddress, text),
        onMessage: (message) => get().upsertMessage(message.conversationWith, message),
        onError: (error) => console.warn('Secure messaging:', error.code ?? '', error.message),
      })
      set({ status: 'ready', deviceId: client.deviceId })
    } catch (error) {
      set({ status: 'error', error: { code: error.code ?? 'UNKNOWN', message: error.message } })
    }
  },

  disconnect: () => {
    client?.stop()
    client = null
    set({ status: 'idle', deviceId: null, conversations: [], messagesByConversation: {}, activeConversationId: null })
  },

  openConversation: async (address) => {
    const conversationId = address.toLowerCase()
    set((state) => ({
      activeConversationId: conversationId,
      conversations: state.conversations.includes(conversationId) ? state.conversations : [conversationId, ...state.conversations],
    }))
    if (client) {
      for (const message of await client.loadHistory(conversationId)) {
        get().upsertMessage(conversationId, message)
      }
    }
  },

  send: async (text) => {
    const { activeConversationId } = get()
    if (!client || !activeConversationId || !text.trim()) {
      return
    }
    await client.send(activeConversationId, text.trim())
  },

  upsertMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.includes(conversationId) ? state.conversations : [conversationId, ...state.conversations],
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [
          ...(state.messagesByConversation[conversationId] ?? []).filter((item) => item.id !== message.id),
          message,
        ].sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
      },
    })),
}))
