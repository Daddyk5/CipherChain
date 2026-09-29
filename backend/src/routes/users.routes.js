import { Router } from 'express'
import { createUserController } from '../controllers/userController.js'

export function createUsersRouter({ db, requireUser }) {
  const usersRouter = Router()
  const controller = createUserController({ db })

  usersRouter.get('/:walletAddress', requireUser, controller.getProfile)
  usersRouter.patch('/:walletAddress', requireUser, controller.updateProfile)

  return usersRouter
}
