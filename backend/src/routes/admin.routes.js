import { Router } from 'express'
import { createAdminController } from '../controllers/adminController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

export function createAdminRouter({ db, requireUser }) {
  const adminRouter = Router()
  const controller = createAdminController({ db })

  adminRouter.get('/status', requireUser, requireAdmin, controller.getAdminStatus)

  return adminRouter
}
