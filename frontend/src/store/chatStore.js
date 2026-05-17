import { create } from 'zustand'

export const useChatStore = create((set) => ({
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  setConversations: (conversations) => set({ conversations }),
  upsertMessage: (conversationId, message) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [
          ...(state.messagesByConversation[conversationId] ?? []).filter((item) => item.id !== message.id),
          message,
        ],
      },
    })),
}))
