// Builds an EIP-4361 (Sign-In with Ethereum) message.
// The server builds the exact text and stores it with the nonce, so the client
// signs precisely what the server later verifies. The server never parses
// client-supplied message text.
export function buildSiweMessage({
  domain,
  address,
  statement,
  uri,
  chainId,
  nonce,
  issuedAt,
  expirationTime,
}) {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    'Version: 1',
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration Time: ${expirationTime}`,
  ].join('\n')
}
