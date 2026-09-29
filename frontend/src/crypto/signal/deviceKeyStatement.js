import { getAddress, verifyMessage } from 'ethers'

// The exact text a wallet signs to vouch for a device's Signal identity key.
// Must stay byte-identical to backend/src/keys/deviceKeyStatement.js.
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

// True only if `device.identityKey` was signed by `walletAddress`. This is what
// stops a malicious server from substituting its own keys: it would need the
// victim's wallet to sign them.
export function isDeviceSignedByWallet(walletAddress, device) {
  try {
    const statement = buildDeviceKeyStatement({
      walletAddress: getAddress(walletAddress),
      identityKey: device.identityKey,
      registrationId: device.registrationId,
    })
    return verifyMessage(statement, device.identitySignature).toLowerCase() === walletAddress.toLowerCase()
  } catch {
    return false
  }
}
