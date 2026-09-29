// Must run after requireUser. Admin status comes from the verified session
// (allow-list checked server-side). Client-supplied headers are never trusted for it.
export function requireAdmin(request, response, next) {
  if (!request.user?.isAdmin) {
    return response.status(403).json({ message: 'Admin wallet is required.' })
  }

  return next()
}
