import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout.jsx'
import { AdminLayout } from '../layouts/AdminLayout.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'
import { LandingPage } from '../pages/Landing/LandingPage.jsx'
import { LoginPage } from '../pages/Login/LoginPage.jsx'
import { RegisterPage } from '../pages/Auth/RegisterPage.jsx'
import { ForgotPasswordPage } from '../pages/Auth/ForgotPasswordPage.jsx'
import { TwoFactorPage } from '../pages/Auth/TwoFactorPage.jsx'
import { SessionVerificationPage } from '../pages/Auth/SessionVerificationPage.jsx'
import { WalletConnectPage } from '../pages/Auth/WalletConnectPage.jsx'
import { UnauthorizedPage } from '../pages/Auth/UnauthorizedPage.jsx'
import { DashboardPage } from '../pages/Dashboard/DashboardPage.jsx'
import { ChatPage } from '../pages/Chat/ChatPage.jsx'
import { ProfilePage } from '../pages/Profile/ProfilePage.jsx'
import { SettingsPage } from '../pages/Settings/SettingsPage.jsx'
import { AdminPage } from '../pages/Admin/AdminPage.jsx'
import { AdminLoginPage } from '../pages/Admin/AdminLoginPage.jsx'
import { AdminVerifyPage } from '../pages/Admin/AdminVerifyPage.jsx'
import { AdminSectionPage } from '../pages/Admin/AdminSectionPage.jsx'

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/welcome" replace />} />
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/two-factor" element={<TwoFactorPage />} />
      <Route path="/verify-session" element={<SessionVerificationPage />} />
      <Route path="/connect-wallet" element={<WalletConnectPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/verify" element={<AdminVerifyPage />} />

      <Route element={<ProtectedRoute area="user" />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="chat/:conversationId?" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute area="admin" permission="admin:read" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminPage />} />
          <Route path="users" element={<AdminSectionPage section="users" />} />
          <Route path="reports" element={<AdminSectionPage section="reports" />} />
          <Route path="logs" element={<AdminSectionPage section="logs" />} />
          <Route path="blockchain" element={<AdminSectionPage section="blockchain" />} />
          <Route path="roles" element={<AdminSectionPage section="roles" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  )
}
