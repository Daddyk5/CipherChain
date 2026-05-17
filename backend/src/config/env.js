import 'dotenv/config'

export const env = {
  PORT: Number(process.env.PORT ?? 8080),
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  ADMIN_WALLET_ADDRESSES: process.env.ADMIN_WALLET_ADDRESSES?.split(',')
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean) ?? [],
  POLYGON_RPC_URL: process.env.POLYGON_RPC_URL,
  MESSAGE_VERIFIER_ADDRESS: process.env.MESSAGE_VERIFIER_ADDRESS,
}
