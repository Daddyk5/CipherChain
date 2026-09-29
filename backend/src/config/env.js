import 'dotenv/config'

function list(value) {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? []
}

export const env = {
  PORT: Number(process.env.PORT ?? 8080),
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_CA_CERT_PATH: process.env.DATABASE_CA_CERT_PATH,
  ADMIN_WALLET_ADDRESSES: list(process.env.ADMIN_WALLET_ADDRESSES).map((address) => address.toLowerCase()),
  POLYGON_RPC_URL: process.env.POLYGON_RPC_URL,
  MESSAGE_VERIFIER_ADDRESS: process.env.MESSAGE_VERIFIER_ADDRESS,
  // EIP-4361 domain and URI. These must match the frontend origin the user signs from.
  AUTH_DOMAIN: process.env.AUTH_DOMAIN ?? 'localhost:5173',
  AUTH_URI: process.env.AUTH_URI ?? 'http://localhost:5173',
  AUTH_ALLOWED_CHAIN_IDS: list(process.env.AUTH_ALLOWED_CHAIN_IDS ?? '80002').map(Number),
  AUTH_NONCE_TTL_SECONDS: Number(process.env.AUTH_NONCE_TTL_SECONDS ?? 300),
  SESSION_TTL_HOURS: Number(process.env.SESSION_TTL_HOURS ?? 168),
}
