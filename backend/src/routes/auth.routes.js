import { Router } from 'express'
import { issueNonce, verifyWalletSignature } from '../controllers/authController.js'

export const authRouter = Router()

authRouter.post('/nonce', issueNonce)
authRouter.post('/verify-wallet', verifyWalletSignature)
