// The exact text a wallet signs to vouch for a device's Signal identity key.
// Must stay byte-identical to frontend/src/crypto/signal/deviceKeyStatement.js.
export function buildDeviceKeyStatement({ walletAddress, identityKey, registrationId }) {
  return [
    'CipherChain device key',
    '',
    'I authorize this device to send and receive encrypted messages for my wallet.',
    '',
    `Wallet: ${walletAddress}`,
    `Identity key: ${identityKey}`,
    `Registration ID: ${registrationId}`,
  ].join('\n')
}
