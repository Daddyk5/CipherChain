import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const baseSession = {
  user: null,
  admin: null,
  isHydrated: false,
  isSessionValidating: false,
  lastLoginAt: null,
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      ...baseSession,
      loginUser: ({ email = 'operator@cipherchain.dev', walletAddress = null } = {}) =>
        set({
          user: {
            id: 'user-session',
            email,
            walletAddress,
            role: 'user',
            permissions: ['chat:read', 'chat:write', 'profile:update', 'wallet:verify'],
          },
          lastLoginAt: new Date().toISOString(),
        }),
      loginAdmin: ({ email = 'admin@cipherchain.dev', role = 'admin' } = {}) =>
        set({
          admin: {
            id: 'admin-session',
            email,
            role,
            permissions: [
              'admin:read',
              'users:manage',
              'reports:moderate',
              'wallets:verify',
              'logs:read',
              'roles:manage',
            ],
          },
          lastLoginAt: new Date().toISOString(),
        }),
      logoutUser: () => set({ user: null }),
      logoutAdmin: () => set({ admin: null }),
      logoutAll: () => set({ user: null, admin: null }),
      validateSession: async () => {
        set({ isSessionValidating: true })
        await new Promise((resolve) => setTimeout(resolve, 350))
        set({ isSessionValidating: false })
        return Boolean(get().user || get().admin)
      },
      hasUserPermission: (permission) => get().user?.permissions.includes(permission) ?? false,
      hasAdminPermission: (permission) => get().admin?.permissions.includes(permission) ?? false,
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'cipherchain-auth-session',
      partialize: (state) => ({
        user: state.user,
        admin: state.admin,
        lastLoginAt: state.lastLoginAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
        state?.validateSession()
      },
    },
  ),
)
