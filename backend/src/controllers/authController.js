import { randomUUID } from 'node:crypto'

export function issueNonce(_request, response) {
  response.json({
    nonce: randomUUID(),
    statement: 'Sign this nonce to authenticate with CipherChain.',
  })
}

export function verifyWalletSignature(_request, response) {
  response.status(501).json({
    message: 'Wallet signature verification placeholder. Validate EIP-191/EIP-4361 signatures here.',
  })
}
