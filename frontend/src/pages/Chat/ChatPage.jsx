import { useEffect, useRef } from 'react'
import { isAddress } from 'ethers'
import { useNavigate, useParams } from 'react-router-dom'
import { ConversationList } from '../../components/chat/ConversationList.jsx'
import { MessageBubble } from '../../components/chat/MessageBubble.jsx'
import { MessageComposer } from '../../components/chat/MessageComposer.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { useChatStore } from '../../store/chatStore.js'

const shortAddress = (address) => `${address.slice(0, 6)}…${address.slice(-4)}`

export function ChatPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const walletAddress = useAuthStore((state) => state.user?.walletAddress)
  const { status, error, connect, openConversation, send, activeConversationId, messagesByConversation } = useChatStore()
  const messages = messagesByConversation[activeConversationId] ?? []
  const bottomRef = useRef(null)

  useEffect(() => {
    if (walletAddress && status === 'idle') {
      connect(walletAddress)
    }
  }, [walletAddress, status, connect])

  useEffect(() => {
    if (status === 'ready' && conversationId && isAddress(conversationId)) {
      openConversation(conversationId)
    }
  }, [status, conversationId, openConversation])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  if (status !== 'ready') {
    return (
      <section className="grid flex-1 place-items-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="text-lg font-semibold text-white">
            {status === 'error' ? 'Encrypted messaging unavailable' : 'Setting up encrypted messaging…'}
          </h2>
          <p className="text-sm text-slate-400">
            {status === 'error'
              ? error?.message
              : 'The first time, MetaMask asks you to sign a statement that links this device’s encryption key to your wallet. It is free and sends no transaction.'}
          </p>
          {status === 'error' && <Button onClick={() => { useChatStore.setState({ status: 'idle' }) }}>Try again</Button>}
        </div>
      </section>
    )
  }

  return (
    <section className="flex min-h-svh flex-1 flex-col md:flex-row">
      <ConversationList onSelect={(address) => navigate(`/app/chat/${address}`)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-800 bg-slate-950/75 px-4 py-4 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-white">
            {activeConversationId ? shortAddress(activeConversationId) : 'No conversation selected'}
          </h2>
          <p className="text-xs text-slate-500">
            End-to-end encrypted (Signal protocol). The server only relays ciphertext.
          </p>
        </header>
        <div className="cc-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
          {!activeConversationId && (
            <p className="text-sm text-slate-500">Start a conversation by entering a wallet address.</p>
          )}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={{
                own: message.from === walletAddress?.toLowerCase(),
                sender: message.from === walletAddress?.toLowerCase() ? 'You' : shortAddress(message.from),
                timestamp: new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                body: message.text,
              }}
            />
          ))}
          <div ref={bottomRef} />
        </div>
        {activeConversationId && <MessageComposer onSend={send} />}
      </div>
    </section>
  )
}
