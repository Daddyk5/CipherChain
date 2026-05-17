import { Router } from 'express'
import { getProfile, updateProfile } from '../controllers/userController.js'
import { requireFirebaseUser } from '../middleware/requireFirebaseUser.js'

export const usersRouter = Router()

usersRouter.get('/:walletAddress', requireFirebaseUser, getProfile)
usersRouter.patch('/:walletAddress', requireFirebaseUser, updateProfile)
