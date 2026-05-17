export const encryptedMessageModelShape = {
  conversationId: 'string',
  senderWalletAddress: 'string',
  ciphertext: 'bytes',
  iv: 'bytes',
  messageHash: 'bytes32',
  signature: 'string',
  createdAt: 'timestamp',
}
