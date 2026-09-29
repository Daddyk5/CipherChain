import { create } from 'zustand'
import { apiRequest, setIdTokenProvider } from '../services/api/httpClient.js'
import { authenticateWallet } from '../services/auth/walletAuth.js'
import { useChatStore } from './chatStore.js'

const USER_PERMISSIONS = ['chat:read', 'chat:write', 'profile:update', 'wallet:verify']
const ADMIN_PERMISSIONS = ['admin:read', 'users:manage', 'reports:moderate', 'wallets:verify', 'logs:read', 'roles:manage']
const TOKEN_KEY = 'cipherchain-session-token'

// The session token is an opaque, server-revocable bearer token. It lives in
// localStorage, which XSS can read. That matches the threat model: XSS already
// counts as device compromise, since E2E keys live in the same origin's storage.
function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // Storage unavailable (private mode): the session lasts for this tab only.
  }
}

let sessionToken = readToken()
setIdTokenProvider(() => sessionToken)

// The UI never grants itself a session or a role. Both come from the backend,
// which enforces them again on every request.
function sessionFromServer({ walletAddress, isAdmin }) {
  const identity = { id: walletAddress.toLowerCase(), walletAddress }
  return {
    user: { ...identity, role: 'user', permissions: USER_PERMISSIONS },
    admin: isAdmin ? { ...identity, role: 'admin', permissions: ADMIN_PERMISSIONS } : null,
  }
}

function setToken(token) {
  sessionToken = token
  writeToken(token)
}

export const useAuthStore = create((set, get) => ({
  user: null,
  admin: null,
  isHydrated: false,
  isSessionValidating: false,
  isSigningIn: false,
  error: null,

  signInWithWallet: async () => {
    set({ isSigningIn: true, error: null })
    try {
      const result = await authenticateWallet()
      setToken(result.sessionToken)
      const session = sessionFromServer(result)
      set({ ...session, isSigningIn: false })
      return session
    } catch (error) {
      set({ isSigningIn: false, error: { code: error.code ?? 'UNKNOWN', message: error.message } })
      return null
    }
  },
  clearError: () => set({ error: null }),
  logoutUser: () => get().logoutAll(),
  logoutAdmin: () => get().logoutAll(),
  logoutAll: async () => {
    const token = sessionToken
    setToken(null)
    useChatStore.getState().disconnect()
    set({ user: null, admin: null })
    if (token) {
      await apiRequest('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  },
  hasUserPermission: (permission) => get().user?.permissions.includes(permission) ?? false,
  hasAdminPermission: (permission) => get().admin?.permissions.includes(permission) ?? false,
}))

// Restores the session on page load by asking the backend whether the stored
// token is still valid.
export async function initAuthListener() {
  if (!sessionToken) {
    useAuthStore.setState({ isHydrated: true })
    return
  }
  useAuthStore.setState({ isSessionValidating: true })
  try {
    const session = await apiRequest('/auth/session')
    useAuthStore.setState({ ...sessionFromServer(session), isHydrated: true, isSessionValidating: false })
  } catch (error) {
    if (error.status === 401) {
      setToken(null)
    }
    useAuthStore.setState({ user: null, admin: null, isHydrated: true, isSessionValidating: false })
  }
}
