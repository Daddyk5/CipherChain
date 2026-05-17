import { Router } from 'express'
import { getAdminStatus } from '../controllers/adminController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

export const adminRouter = Router()

adminRouter.get('/status', requireAdmin, getAdminStatus)
