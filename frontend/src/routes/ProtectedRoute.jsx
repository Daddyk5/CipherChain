import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingScreen } from '../components/ui/LoadingScreen.jsx'
import { useAuthStore } from '../store/authStore.js'

export function ProtectedRoute({ area = 'user', permission }) {
  const location = useLocation()
  const { user, admin, isHydrated, isSessionValidating, hasUserPermission, hasAdminPermission } = useAuthStore()
  const session = area === 'admin' ? admin : user
  const loginPath = area === 'admin' ? '/admin/login' : '/login'
  const allowed = permission ? (area === 'admin' ? hasAdminPermission(permission) : hasUserPermission(permission)) : true

  if (!isHydrated || isSessionValidating) {
    return <LoadingScreen label="Validating encrypted session" />
  }

  if (!session) {
    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  if (!allowed) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
