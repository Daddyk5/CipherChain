import { Router } from 'express'
import { verifyMessageHash } from '../controllers/messageController.js'
import { requireFirebaseUser } from '../middleware/requireFirebaseUser.js'

export const messagesRouter = Router()

messagesRouter.post('/verify-hash', requireFirebaseUser, verifyMessageHash)
