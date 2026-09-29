// Captures README screenshots from the real app: two browser sessions (Alice,
// Bob) sign in with scripted wallets, set up E2E device keys, and exchange
// encrypted messages through the backend.
//
// Prereqs (separate terminals):
//   CORS_ORIGIN=http://localhost:5174 AUTH_DOMAIN=localhost:5174 AUTH_URI=http://localhost:5174 npm run dev:demo --workspace backend
//   npx vite --port 5174 (in frontend/)
// Then: node frontend/scripts/screenshots.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getBytes, Wallet } from 'ethers'
import { chromium } from 'playwright'

const APP = process.env.APP_URL ?? 'http://localhost:5174'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'images')
const CHAIN_ID_HEX = '0x13882' // Polygon Amoy (80002)

// Stands in for MetaMask: an EIP-1193 provider whose signing happens in Node
// with a throwaway key. The app code path is the same as with a real wallet.
async function openAs(browser, wallet, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, colorScheme: 'dark', deviceScaleFactor: 1 })
  await context.exposeFunction('__walletRequest', async (method, params) => {
    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return [wallet.address.toLowerCase()]
      case 'eth_chainId':
        return CHAIN_ID_HEX
      case 'net_version':
        return '80002'
      case 'wallet_switchEthereumChain':
        return null
      case 'personal_sign':
        return wallet.signMessage(getBytes(params[0]))
      default:
        throw new Error(`unsupported wallet method ${method}`)
    }
  })
  await context.addInitScript(() => {
    window.ethereum = {
      isMetaMask: true,
      request: ({ method, params }) => window.__walletRequest(method, params ?? []),
      on: () => {},
      removeListener: () => {},
    }
  })
  const page = await context.newPage()
  return { context, page, wallet, address: wallet.address.toLowerCase() }
}

async function signIn(user) {
  await user.page.goto(`${APP}/login`)
  await user.page.getByRole('button', { name: 'Sign in with MetaMask' }).click()
  await user.page.waitForURL(`${APP}/app`)
  await user.page.goto(`${APP}/app/chat`)
  await user.page.getByText('Conversations').waitFor({ timeout: 60000 })
}

async function send(user, text) {
  const box = user.page.getByPlaceholder('Encrypt and send a message...')
  await box.fill(text)
  await box.press('Enter')
  await user.page.getByText(text, { exact: true }).last().waitFor()
}

async function waitForText(user, text) {
  await user.page.getByText(text, { exact: true }).last().waitFor({ timeout: 30000 })
}

const shot = (user, name) => user.page.screenshot({ path: join(OUT, name) })

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
try {
  const alice = await openAs(browser, Wallet.createRandom())
  const bob = await openAs(browser, Wallet.createRandom())

  await alice.page.goto(`${APP}/welcome`)
  await alice.page.waitForTimeout(800)
  await shot(alice, 'landing.png')

  await alice.page.goto(`${APP}/login`)
  await alice.page.waitForTimeout(500)
  await shot(alice, 'login.png')

  await signIn(alice)
  await signIn(bob)

  // Capture one real envelope as the server stores it (for the README).
  let sampleEnvelope = null
  bob.page.on('response', async (response) => {
    if (!sampleEnvelope && response.url().includes('/api/messages/inbox')) {
      const { envelopes } = await response.json().catch(() => ({}))
      if (envelopes?.length) sampleEnvelope = envelopes[0]
    }
  })

  await alice.page.goto(`${APP}/app/chat/${bob.address}`)
  await bob.page.goto(`${APP}/app/chat/${alice.address}`)
  await alice.page.getByPlaceholder('Encrypt and send a message...').waitFor()
  await bob.page.getByPlaceholder('Encrypt and send a message...').waitFor()

  const script = [
    [alice, bob, 'Hey Bob, are you on the new build? Keys look good on my side.'],
    [bob, alice, 'Yep. My device key is signed by my wallet, and I verified yours before replying.'],
    [alice, bob, 'Perfect. The audit notes are ready. Sending the summary here, not over email.'],
    [bob, alice, 'Good call. The relay only sees ciphertext and deletes it once I have it.'],
    [alice, bob, 'Ratchet has turned a few times now. Talk after the standup?'],
    [bob, alice, 'Sounds good 👍'],
  ]
  for (const [from, to, text] of script) {
    await send(from, text)
    await waitForText(to, text)
  }
  // Tall enough that the whole conversation fits without clipping.
  await alice.page.setViewportSize({ width: 1440, height: 1040 })
  await bob.page.setViewportSize({ width: 1440, height: 1040 })
  await alice.page.waitForTimeout(600)
  await bob.page.waitForTimeout(600)

  await shot(alice, 'chat-alice.png')
  await shot(bob, 'chat-bob.png')

  await bob.page.setViewportSize({ width: 390, height: 844 })
  await bob.page.waitForTimeout(500)
  await shot(bob, 'chat-mobile.png')

  if (sampleEnvelope) {
    await writeFile(join(OUT, 'sample-envelope.json'), `${JSON.stringify(sampleEnvelope, null, 2)}\n`)
  }
  console.log(`Screenshots written to ${OUT}`)
} finally {
  await browser.close()
}
